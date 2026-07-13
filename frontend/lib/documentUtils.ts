export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.click();
}

export function printHtml(
  title: string,
  bodyHtml: string,
  extraStyles: string = ""
) {
  const iframe = document.createElement("iframe");

  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0";

  document.body.appendChild(iframe);

  iframe.srcdoc = `
<!DOCTYPE html>
<html dir="rtl">

<head>

<meta charset="UTF-8">

<title>${title}</title>

<style>

*{
    box-sizing:border-box;
}

@page{
    size:A4 portrait;
    margin:15mm;
}

body{
    font-family:Cairo,Arial,sans-serif;
    margin:0;
    padding:20px;
    color:#1e3a5f;
    background:white;
}

.header{
    text-align:center;
    margin-bottom:20px;
    padding-bottom:10px;
    border-bottom:3px solid #c9a03d;
}

.header h1{
    font-size:24px;
    margin:0;
}

table{
    width:100%;
    border-collapse:collapse;
    margin:15px 0;
    font-size:13px;
}

thead{
    display:table-header-group;
}

tfoot{
    display:table-footer-group;
}

tr{
    page-break-inside:avoid;
}

th{
    background:#1e3a5f;
    color:white;
    padding:10px;
    border:1px solid #1e3a5f;
    font-size:14px;
}

td{
    padding:8px;
    border:1px solid #ddd;
    text-align:center;
    font-size:13px;
}

tr:nth-child(even){
    background:#f9fafb;
}

.gold{
    color:#c9a03d;
    font-weight:bold;
}

img{
    max-width:100%;
}

${extraStyles}

</style>

</head>

<body>

${bodyHtml}

</body>

</html>
`;

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 400);
  };
}
