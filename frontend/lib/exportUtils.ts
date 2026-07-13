// lib/printUtils.ts
export const printAsPDF = (
  data: (string | number)[][],
  headers: string[],
  title: string,
  isArabic: boolean
) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="${isArabic ? "rtl" : "ltr"}">
    <head>
      <title>${title}</title>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: ${isArabic ? "Cairo, Arial" : "Arial, sans-serif"};
          margin: 20px;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #c9a03d;
          padding-bottom: 10px;
        }
        .header h1 {
          color: #1e3a5f;
          margin: 0;
          font-size: 24px;
        }
        .header p {
          color: #666;
          margin: 5px 0 0;
          font-size: 12px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 10px 8px;
          text-align: ${isArabic ? "right" : "left"};
        }
        th {
          background-color: #1e3a5f;
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 10px;
          color: #999;
          border-top: 1px solid #eee;
          padding-top: 10px;
        }
        @media print {
          body {
            margin: 0;
            padding: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <p>تاريخ الطباعة: ${new Date().toLocaleDateString(
          isArabic ? "ar-EG" : "en-US"
        )}</p>
      </div>
      <table>
        <thead>
          <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${data
            .map(
              (row) =>
                `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`
            )
            .join("")}
        </tbody>
      </table>
      <div class="footer">
        <p>الوطنية للتنمية العمرانية - Al-Wataniya Urban Development</p>
        <p>تم إنشاء هذا التقرير بواسطة النظام الآلي</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.print();
  printWindow.close();
};
