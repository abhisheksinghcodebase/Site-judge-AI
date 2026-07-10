"""
PDF Report Generation endpoint.

Generates a professional PDF report containing:
- Header with branding, URL, scan date, overall score
- Executive summary
- Category score breakdown
- Issues list with severity, description, impact, and fix suggestions
- AI fix prompts for each issue (copy-paste ready)
- Consolidated problem statement
"""

import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak,
)
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics import renderPDF

from app.core.database import get_db
from app.models.db import Report, Scan, ScanStatus

router = APIRouter(prefix="/reports", tags=["pdf"])


# ── Color palette ──────────────────────────────────────────────────────

BRAND_PURPLE = colors.HexColor("#8b5cf6")
BRAND_DARK = colors.HexColor("#0c0c14")
DARK_BG = colors.HexColor("#111120")
TEXT_PRIMARY = colors.HexColor("#f1f5f9")
TEXT_SECONDARY = colors.HexColor("#94a3b8")
SEVERITY_COLORS = {
    "critical": colors.HexColor("#ef4444"),
    "medium": colors.HexColor("#f59e0b"),
    "minor": colors.HexColor("#94a3b8"),
}
SCORE_COLORS = {
    "excellent": colors.HexColor("#34d399"),
    "good": colors.HexColor("#84cc16"),
    "fair": colors.HexColor("#f59e0b"),
    "poor": colors.HexColor("#f97316"),
    "critical": colors.HexColor("#f87171"),
}


def _score_color(score):
    if score is None:
        return colors.gray
    if score >= 90:
        return SCORE_COLORS["excellent"]
    if score >= 75:
        return SCORE_COLORS["good"]
    if score >= 60:
        return SCORE_COLORS["fair"]
    if score >= 40:
        return SCORE_COLORS["poor"]
    return SCORE_COLORS["critical"]


def _score_label(score):
    if score is None:
        return "N/A"
    if score >= 90:
        return "Excellent"
    if score >= 75:
        return "Good"
    if score >= 60:
        return "Fair"
    if score >= 40:
        return "Needs Work"
    return "Critical"


def _severity_emoji(sev):
    return {"critical": "🔴", "medium": "🟡", "minor": "⚪"}.get(sev, "⚪")


def _truncate(text, max_len=500):
    if not text:
        return ""
    if len(text) <= max_len:
        return text
    return text[:max_len] + "..."


# ── Style setup ────────────────────────────────────────────────────────

def _build_styles():
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        "PDFTitle",
        parent=styles["Title"],
        fontSize=24,
        leading=30,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=6,
        fontName="Helvetica-Bold",
    ))

    styles.add(ParagraphStyle(
        "PDFSubtitle",
        parent=styles["Normal"],
        fontSize=11,
        leading=16,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=20,
    ))

    styles.add(ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=16,
        leading=22,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=20,
        spaceAfter=10,
        fontName="Helvetica-Bold",
        borderPadding=(0, 0, 4, 0),
    ))

    styles.add(ParagraphStyle(
        "BodyText2",
        parent=styles["Normal"],
        fontSize=10,
        leading=15,
        textColor=colors.HexColor("#334155"),
        alignment=TA_JUSTIFY,
    ))

    styles.add(ParagraphStyle(
        "IssueTitle",
        parent=styles["Normal"],
        fontSize=11,
        leading=16,
        textColor=colors.HexColor("#1e293b"),
        fontName="Helvetica-Bold",
        spaceAfter=4,
    ))

    styles.add(ParagraphStyle(
        "IssueBody",
        parent=styles["Normal"],
        fontSize=9,
        leading=14,
        textColor=colors.HexColor("#475569"),
    ))

    styles.add(ParagraphStyle(
        "CodeStyle",
        parent=styles["Code"],
        fontSize=8,
        leading=12,
        textColor=colors.HexColor("#7c3aed"),
        backColor=colors.HexColor("#f5f3ff"),
        borderPadding=6,
        fontName="Courier",
    ))

    styles.add(ParagraphStyle(
        "PromptStyle",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b"),
        backColor=colors.HexColor("#f0fdf4"),
        borderPadding=8,
        fontName="Courier",
    ))

    styles.add(ParagraphStyle(
        "FooterStyle",
        parent=styles["Normal"],
        fontSize=8,
        leading=12,
        textColor=colors.HexColor("#94a3b8"),
        alignment=TA_CENTER,
    ))

    return styles


# ── PDF Builder ────────────────────────────────────────────────────────

def generate_pdf(scan, report, issues) -> bytes:
    """Generate a complete PDF report and return the bytes."""
    buffer = io.BytesIO()
    styles = _build_styles()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=50,
        leftMargin=50,
        topMargin=50,
        bottomMargin=50,
        title=f"SiteJudge AI Report — {scan.url}",
        author="SiteJudge AI",
    )

    elements = []

    # ── Header ─────────────────────────────────────────────────────
    elements.append(Paragraph("⚖️ SiteJudge AI Report", styles["PDFTitle"]))
    elements.append(Paragraph(
        f"<b>URL:</b> {scan.url}&nbsp;&nbsp;|&nbsp;&nbsp;"
        f"<b>Date:</b> {(scan.completed_at or scan.created_at).strftime('%B %d, %Y %H:%M UTC')}&nbsp;&nbsp;|&nbsp;&nbsp;"
        f"<b>Overall Score:</b> {report.overall_score}/100",
        styles["PDFSubtitle"],
    ))

    elements.append(HRFlowable(
        width="100%", thickness=2,
        color=colors.HexColor("#e2e8f0"),
        spaceAfter=16,
    ))

    # ── Executive Summary ──────────────────────────────────────────
    elements.append(Paragraph("Executive Summary", styles["SectionHeading"]))
    summary = report.executive_summary or "No executive summary available."
    elements.append(Paragraph(summary, styles["BodyText2"]))
    elements.append(Spacer(1, 16))

    # ── Category Scores ────────────────────────────────────────────
    elements.append(Paragraph("Category Breakdown", styles["SectionHeading"]))

    categories = [
        ("Performance", report.performance),
        ("Accessibility", report.accessibility),
        ("SEO", report.seo),
        ("Security", report.security),
        ("Best Practices", report.best_practices),
        ("UI/UX", report.ux),
        ("Responsiveness", report.responsiveness),
        ("Code Quality", report.code_quality),
        ("Efficiency", report.efficiency),
        ("Alignment", report.alignment),
    ]

    # Build table data
    score_data = [["Category", "Score", "Rating"]]
    for name, score in categories:
        if score is not None:
            score_data.append([name, f"{score}/100", _score_label(score)])

    if len(score_data) > 1:
        score_table = Table(score_data, colWidths=[200, 80, 100])
        score_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
            ("TOPPADDING", (0, 0), (-1, 0), 10),
            ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
            ("TOPPADDING", (0, 1), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafafa")]),
            ("ALIGN", (1, 0), (1, -1), "CENTER"),
            ("ALIGN", (2, 0), (2, -1), "CENTER"),
        ]))
        elements.append(score_table)
    elements.append(Spacer(1, 20))

    # ── Issues ─────────────────────────────────────────────────────
    elements.append(Paragraph("Issues Found", styles["SectionHeading"]))

    severity_counts = {"critical": 0, "medium": 0, "minor": 0}
    for issue in issues:
        sev = issue.severity.value if hasattr(issue.severity, "value") else issue.severity
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    elements.append(Paragraph(
        f"<b>{len(issues)} total issues</b>&nbsp;&nbsp;—&nbsp;&nbsp;"
        f"🔴 {severity_counts.get('critical', 0)} Critical&nbsp;&nbsp;"
        f"🟡 {severity_counts.get('medium', 0)} Medium&nbsp;&nbsp;"
        f"⚪ {severity_counts.get('minor', 0)} Minor",
        styles["BodyText2"],
    ))
    elements.append(Spacer(1, 12))

    for idx, issue in enumerate(issues, 1):
        sev = issue.severity.value if hasattr(issue.severity, "value") else issue.severity
        cat = issue.category.value if hasattr(issue.category, "value") else issue.category

        issue_elements = []

        # Issue header
        severity_label = sev.upper()
        issue_elements.append(Paragraph(
            f"<font color='#{SEVERITY_COLORS.get(sev, colors.gray).hexval()[2:]}'>"
            f"[{severity_label}]</font>&nbsp;&nbsp;"
            f"{idx}. {_truncate(issue.title, 200)}",
            styles["IssueTitle"],
        ))

        # Category + confidence
        issue_elements.append(Paragraph(
            f"<font color='#8b5cf6'>Category:</font> {cat.replace('_', ' ').title()}"
            f"&nbsp;&nbsp;|&nbsp;&nbsp;"
            f"<font color='#8b5cf6'>Confidence:</font> {int(issue.confidence * 100)}%",
            styles["IssueBody"],
        ))

        # Description
        if issue.description:
            issue_elements.append(Spacer(1, 4))
            issue_elements.append(Paragraph(
                f"<b>Problem:</b> {_truncate(issue.description)}", styles["IssueBody"]
            ))

        # Impact
        if issue.impact:
            issue_elements.append(Paragraph(
                f"<b>Impact:</b> {_truncate(issue.impact)}", styles["IssueBody"]
            ))

        # Fix suggestion
        if issue.fix_suggestion:
            issue_elements.append(Paragraph(
                f"<b>Fix:</b> {_truncate(issue.fix_suggestion)}", styles["IssueBody"]
            ))

        # Code example
        if issue.code_example:
            issue_elements.append(Spacer(1, 4))
            issue_elements.append(Paragraph(
                _truncate(issue.code_example, 300), styles["CodeStyle"]
            ))

        issue_elements.append(Spacer(1, 4))
        issue_elements.append(HRFlowable(
            width="100%", thickness=0.5,
            color=colors.HexColor("#e2e8f0"),
            spaceAfter=8,
        ))

        elements.append(KeepTogether(issue_elements))

    # ── AI Fix Prompts ─────────────────────────────────────────────
    elements.append(PageBreak())
    elements.append(Paragraph("AI Fix Prompts", styles["SectionHeading"]))
    elements.append(Paragraph(
        "Copy-paste these prompts into ChatGPT, Claude, or Gemini to get "
        "targeted fixes for each issue. Each prompt includes the full context "
        "so the AI can provide accurate, actionable code solutions.",
        styles["BodyText2"],
    ))
    elements.append(Spacer(1, 12))

    for idx, issue in enumerate(issues, 1):
        sev = issue.severity.value if hasattr(issue.severity, "value") else issue.severity
        cat = issue.category.value if hasattr(issue.category, "value") else issue.category

        prompt_text = (
            f"I'm auditing my website ({scan.url}) and found this issue:\\n\\n"
            f"**Issue #{idx}: {issue.title}**\\n"
            f"- Severity: {sev.upper()}\\n"
            f"- Category: {cat.replace('_', ' ').title()}\\n"
            f"- Description: {_truncate(issue.description, 300)}\\n"
        )
        if issue.impact:
            prompt_text += f"- Impact: {_truncate(issue.impact, 200)}\\n"
        if issue.fix_suggestion:
            prompt_text += f"- Suggested fix: {_truncate(issue.fix_suggestion, 200)}\\n"

        prompt_text += (
            f"\\nPlease provide:\\n"
            f"1. A clear explanation of why this is a problem\\n"
            f"2. The exact code changes needed to fix it\\n"
            f"3. How to verify the fix is working\\n"
            f"4. Any related best practices I should follow"
        )

        prompt_elements = []
        prompt_elements.append(Paragraph(
            f"<b>Prompt #{idx}:</b> {_truncate(issue.title, 100)}", styles["IssueTitle"]
        ))
        prompt_elements.append(Paragraph(prompt_text, styles["PromptStyle"]))
        prompt_elements.append(Spacer(1, 10))

        elements.append(KeepTogether(prompt_elements))

    # ── Problem Statement ──────────────────────────────────────────
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("Consolidated Problem Statement", styles["SectionHeading"]))

    critical_issues = [i for i in issues
                       if (i.severity.value if hasattr(i.severity, "value") else i.severity) == "critical"]
    medium_issues = [i for i in issues
                     if (i.severity.value if hasattr(i.severity, "value") else i.severity) == "medium"]

    problem_text = (
        f"The website at {scan.url} scored {report.overall_score}/100 in the SiteJudge AI audit. "
    )

    if critical_issues:
        problem_text += (
            f"There are {len(critical_issues)} critical issue(s) that require immediate attention: "
            f"{', '.join(i.title for i in critical_issues[:5])}. "
        )

    if medium_issues:
        problem_text += (
            f"Additionally, {len(medium_issues)} medium-severity issue(s) were identified that "
            f"should be addressed to improve the overall quality. "
        )

    categories_affected = set()
    for issue in issues:
        cat = issue.category.value if hasattr(issue.category, "value") else issue.category
        categories_affected.add(cat.replace("_", " ").title())

    if categories_affected:
        problem_text += (
            f"The affected categories are: {', '.join(sorted(categories_affected))}. "
        )

    problem_text += (
        f"Addressing these issues will improve the website's production readiness, "
        f"user experience, search engine visibility, and overall performance."
    )

    elements.append(Paragraph(problem_text, styles["BodyText2"]))

    # ── Master AI Prompt ───────────────────────────────────────────
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("Master AI Fix Prompt", styles["SectionHeading"]))
    elements.append(Paragraph(
        "Use this comprehensive prompt to address all issues at once:",
        styles["BodyText2"],
    ))
    elements.append(Spacer(1, 8))

    all_issues_text = ""
    for idx, issue in enumerate(issues[:15], 1):  # Cap at 15 to keep prompt manageable
        sev = issue.severity.value if hasattr(issue.severity, "value") else issue.severity
        all_issues_text += f"{idx}. [{sev.upper()}] {issue.title}: {_truncate(issue.description, 150)}\\n"

    master_prompt = (
        f"I ran a comprehensive audit on my website ({scan.url}) using SiteJudge AI. "
        f"The overall score is {report.overall_score}/100. Here are the issues found:\\n\\n"
        f"{all_issues_text}\\n"
        f"Please analyze these issues and provide:\\n"
        f"1. A prioritized action plan to fix the most impactful issues first\\n"
        f"2. Specific code changes for each issue\\n"
        f"3. Quick wins that can be implemented in under 30 minutes\\n"
        f"4. Long-term improvements for overall website quality\\n"
        f"5. Testing strategies to verify each fix"
    )
    elements.append(Paragraph(master_prompt, styles["PromptStyle"]))

    # ── Footer ─────────────────────────────────────────────────────
    elements.append(Spacer(1, 30))
    elements.append(HRFlowable(
        width="100%", thickness=1,
        color=colors.HexColor("#e2e8f0"),
        spaceAfter=10,
    ))
    elements.append(Paragraph(
        f"Generated by SiteJudge AI — "
        f"https://github.com/abhisheksinghcodebase/Site-judge-AI — "
        f"{datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        styles["FooterStyle"],
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()


# ── Endpoint ───────────────────────────────────────────────────────────

@router.get("/{scan_id}/pdf")
async def download_pdf_report(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate and download a comprehensive PDF report for a completed scan.
    Includes scores, issues, AI fix prompts, and a problem statement.
    """
    # Verify scan exists and is complete
    scan_result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = scan_result.scalar_one_or_none()

    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    if scan.status != ScanStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot generate PDF: scan is {scan.status.value}",
        )

    # Load report with issues
    result = await db.execute(
        select(Report)
        .where(Report.scan_id == scan_id)
        .options(selectinload(Report.issues))
    )
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Sort issues: critical first, then by confidence
    sorted_issues = sorted(
        report.issues,
        key=lambda i: (
            {"critical": 0, "medium": 1, "minor": 2}.get(
                i.severity.value if hasattr(i.severity, "value") else i.severity, 3
            ),
            -i.confidence,
        ),
    )

    # Generate PDF
    pdf_bytes = generate_pdf(scan, report, sorted_issues)

    # Build filename from hostname
    try:
        from urllib.parse import urlparse
        hostname = urlparse(scan.url).hostname or "report"
    except Exception:
        hostname = "report"

    filename = f"sitejudge-{hostname}-{scan_id[:8]}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
