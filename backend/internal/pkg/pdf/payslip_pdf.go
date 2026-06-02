package pdf

import (
	"fmt"
	"strings"

	"github.com/arifkurniawan200/hris-multi-merchant/internal/domain"
	"github.com/jung-kurt/gofpdf/v2"
)

const (
	pageW   = 210.0 // A4 width in mm
	pageH   = 297.0 // A4 height in mm
	marginL = 20.0
	marginR = 20.0
	marginT = 20.0
	bodyW   = pageW - marginL - marginR // usable width
)

// BuildPayslipPDF generates a professional payslip PDF for the given payroll record.
// tenantName is the company/tenant display name; emp is the employee record for name/code.
func BuildPayslipPDF(p *domain.Payroll, tenantName string, emp *domain.Employee) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(marginL, marginT, marginR)
	pdf.AddPage()

	// Use built-in Helvetica for clean, professional look
	drawHeader(pdf, tenantName, p, emp)
	drawEmployeeInfo(pdf, emp)
	drawSalaryTable(pdf, p)
	drawStatusAndNotes(pdf, p)
	drawFooter(pdf)

	var buf strings.Builder
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("pdf output: %w", err)
	}
	return []byte(buf.String()), nil
}

// ── Header section ──────────────────────────────────────────────

func drawHeader(pdf *gofpdf.Fpdf, tenantName string, p *domain.Payroll, emp *domain.Employee) {
	pdf.SetFont("Helvetica", "B", 18)
	pdf.CellFormat(bodyW, 10, "PAYSLIP", "", 1, "C", false, 0, "")
	pdf.Ln(2)

	// Company name
	pdf.SetFont("Helvetica", "B", 12)
	pdf.CellFormat(bodyW, 7, strings.ToUpper(tenantName), "", 1, "C", false, 0, "")
	pdf.Ln(1)

	// Period
	monthName := monthName(p.PeriodMonth)
	periodStr := fmt.Sprintf("Period: %s %d", monthName, p.PeriodYear)
	pdf.SetFont("Helvetica", "", 10)
	pdf.CellFormat(bodyW, 6, periodStr, "", 1, "C", false, 0, "")
	pdf.Ln(4)

	// Horizontal line
	y := pdf.GetY()
	pdf.Line(marginL, y, pageW-marginR, y)
	pdf.Ln(5)
}

// ── Employee info section ───────────────────────────────────────

func drawEmployeeInfo(pdf *gofpdf.Fpdf, emp *domain.Employee) {
	leftX := marginL
	rightX := pageW/2 + 5

	pdf.SetFont("Helvetica", "B", 10)
	pdf.CellFormat(bodyW, 6, "EMPLOYEE INFORMATION", "", 1, "L", false, 0, "")
	pdf.Ln(2)

	// Two-column layout
	pdf.SetFont("Helvetica", "", 9.5)

	// Row 1: Employee Name | Employee Code
	pdf.SetX(leftX)
	pdf.CellFormat(40, 5, "Employee Name", "", 0, "L", false, 0, "")
	pdf.SetFont("Helvetica", "B", 9.5)
	pdf.CellFormat(bodyW-40-70, 5, fullName(emp), "", 0, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 9.5)
	pdf.SetX(rightX)
	pdf.CellFormat(30, 5, "Employee Code", "", 0, "L", false, 0, "")
	pdf.SetFont("Helvetica", "B", 9.5)
	pdf.CellFormat(bodyW-30-rightX+marginL, 5, emp.EmployeeCode, "", 1, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 9.5)

	// Row 2: Department | Position
	pdf.SetX(leftX)
	pdf.CellFormat(40, 5, "Department", "", 0, "L", false, 0, "")
	pdf.SetFont("Helvetica", "B", 9.5)
	pdf.CellFormat(bodyW-40-70, 5, emp.DepartmentName, "", 0, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 9.5)
	pdf.SetX(rightX)
	pdf.CellFormat(30, 5, "Position", "", 0, "L", false, 0, "")
	pdf.SetFont("Helvetica", "B", 9.5)
	pdf.CellFormat(bodyW-30-rightX+marginL, 5, emp.PositionName, "", 1, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 9.5)

	// Row 3: Bank Account
	pdf.SetX(leftX)
	pdf.CellFormat(40, 5, "Bank Account", "", 0, "L", false, 0, "")
	pdf.SetFont("Helvetica", "B", 9.5)
	bankStr := emp.BankName
	if emp.BankAccount != "" {
		bankStr = emp.BankName + " - " + emp.BankAccount
	}
	pdf.CellFormat(bodyW-40, 5, bankStr, "", 1, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 9.5)

	pdf.Ln(4)

	// Horizontal line
	y := pdf.GetY()
	pdf.Line(marginL, y, pageW-marginR, y)
	pdf.Ln(5)
}

// ── Salary breakdown table ──────────────────────────────────────

func drawSalaryTable(pdf *gofpdf.Fpdf, p *domain.Payroll) {
	pdf.SetFont("Helvetica", "B", 10)
	pdf.CellFormat(bodyW, 6, "SALARY BREAKDOWN", "", 1, "L", false, 0, "")
	pdf.Ln(3)

	// Table header
	headerH := 7.0
	colW := bodyW * 0.6
	colAmt := bodyW * 0.4

	pdf.SetFillColor(230, 230, 230)
	pdf.SetFont("Helvetica", "B", 9)
	pdf.CellFormat(colW, headerH, "Description", "1", 0, "L", true, 0, "")
	pdf.CellFormat(colAmt, headerH, "Amount", "1", 1, "R", true, 0, "")

	// Table rows
	rowH := 6.5
	pdf.SetFont("Helvetica", "", 9)
	fill := false

	drawRow := func(label string, amount int64, boldAmt bool) {
		amtStr := formatIDR(amount)
		pdf.CellFormat(colW, rowH, label, "1", 0, "L", fill, 0, "")
		if boldAmt {
			pdf.SetFont("Helvetica", "B", 9)
		} else {
			pdf.SetFont("Helvetica", "", 9)
		}
		pdf.CellFormat(colAmt, rowH, amtStr, "1", 1, "R", fill, 0, "")
		pdf.SetFont("Helvetica", "", 9)
	}

	drawRow("Base Salary", p.BaseSalary, false)
	drawRow("Overtime Pay", p.OvertimePay, false)

	// Deductions sub-header
	pdf.SetFont("Helvetica", "I", 8)
	pdf.CellFormat(colW, rowH, "Deductions", "1", 0, "L", fill, 0, "")
	pdf.CellFormat(colAmt, rowH, "", "1", 1, "R", fill, 0, "")
	pdf.SetFont("Helvetica", "", 9)

	if p.LateDeduction > 0 {
		drawRow(fmt.Sprintf("  Late Deduction (%s)", formatIDR(p.LateDeduction)), -p.LateDeduction, false)
	}
	if p.AbsentDeduction > 0 {
		drawRow(fmt.Sprintf("  Absent Deduction (%s)", formatIDR(p.AbsentDeduction)), -p.AbsentDeduction, false)
	}
	if p.LeaveDeduction > 0 {
		drawRow(fmt.Sprintf("  Leave Deduction (%s)", formatIDR(p.LeaveDeduction)), -p.LeaveDeduction, false)
	}
	if p.Reimbursement > 0 {
		drawRow("Reimbursement", p.Reimbursement, false)
	}

	// Net salary row (bold with bg)
	pdf.SetFillColor(240, 240, 240)
	pdf.SetFont("Helvetica", "B", 10)
	pdf.CellFormat(colW, 8, "NET SALARY", "1", 0, "L", true, 0, "")
	pdf.CellFormat(colAmt, 8, formatIDR(p.NetSalary), "1", 1, "R", true, 0, "")

	pdf.Ln(5)
}

// ── Status and notes ────────────────────────────────────────────

func drawStatusAndNotes(pdf *gofpdf.Fpdf, p *domain.Payroll) {
	// Status
	pdf.SetFont("Helvetica", "B", 9)
	statusLabel := fmt.Sprintf("Status: %s", strings.ToUpper(string(p.Status)))
	pdf.CellFormat(bodyW, 6, statusLabel, "", 1, "L", false, 0, "")

	if p.Notes != "" {
		pdf.SetFont("Helvetica", "", 9)
		pdf.CellFormat(bodyW, 5, "Notes: "+p.Notes, "", 1, "L", false, 0, "")
	}

	pdf.Ln(3)

	// Horizontal line
	y := pdf.GetY()
	pdf.Line(marginL, y, pageW-marginR, y)
	pdf.Ln(4)
}

// ── Footer ──────────────────────────────────────────────────────

func drawFooter(pdf *gofpdf.Fpdf) {
	pdf.SetFont("Helvetica", "I", 7)
	footerText := "This is a computer-generated payslip. No signature is required."
	pdf.CellFormat(bodyW, 5, footerText, "", 1, "C", false, 0, "")
}

// ── Helpers ─────────────────────────────────────────────────────

func monthName(m int) string {
	names := []string{
		"", "January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December",
	}
	if m < 1 || m > 12 {
		return ""
	}
	return names[m]
}

func fullName(emp *domain.Employee) string {
	if emp.LastName != "" {
		return emp.FirstName + " " + emp.LastName
	}
	return emp.FirstName
}

func formatIDR(amount int64) string {
	if amount < 0 {
		return "(Rp " + formatInt(-amount) + ")"
	}
	return "Rp " + formatInt(amount)
}

func formatInt(n int64) string {
	s := fmt.Sprintf("%d", n)
	// Insert period separators for thousands
	out := make([]byte, 0, len(s)+len(s)/3)
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			out = append(out, '.')
		}
		out = append(out, byte(c))
	}
	return string(out)
}
