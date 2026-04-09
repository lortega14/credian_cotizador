const xlsx = require('xlsx');
const fs = require('fs');
try {
  const workbook = xlsx.readFile('C:\\Users\\CREDIAN\\Downloads\\Cotizador Arrendamiento CREDIAN.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  // Filter out completely empty rows and save
  const filtered = data.filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));
  fs.writeFileSync('output_utf8.json', JSON.stringify(filtered.slice(0, 100), null, 2), 'utf8');
  console.log('Saved to output_utf8.json');
} catch (e) {
  console.error("Error reading file:", e.message);
}
