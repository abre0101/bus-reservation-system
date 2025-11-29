import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

/**
 * Export POS report to PDF
 */
export const exportToPDF = (data) => {
  const { date, cashDrawer, stats, transactions } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ETHIOBUS', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text('Point of Sale Report', pageWidth / 2, 25, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${date}`, pageWidth / 2, 32, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 37, { align: 'center' });
  
  // Line separator
  doc.setLineWidth(0.5);
  doc.line(15, 40, pageWidth - 15, 40);
  
  let yPos = 48;
  
  // Cash Drawer Summary
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Cash Drawer Summary', 15, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const drawerData = [
    ['Opening Balance', `ETB ${cashDrawer.openingBalance?.toLocaleString() || 0}`],
    ['Total Sales', `ETB ${cashDrawer.totalSales?.toLocaleString() || 0}`],
    ['Cash Sales', `ETB ${cashDrawer.totalCash?.toLocaleString() || 0}`],
    ['Digital Payments', `ETB ${cashDrawer.totalChapa?.toLocaleString() || 0}`],
    ['Tickets Sold', `${cashDrawer.ticketsSold || 0}`],
    ['Current Balance', `ETB ${cashDrawer.currentBalance?.toLocaleString() || 0}`],
    ['Status', cashDrawer.status === 'open' ? 'OPEN' : 'CLOSED']
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: drawerData,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { halign: 'right' }
    },
    margin: { left: 15 }
  });
  
  yPos = doc.lastAutoTable.finalY + 10;
  
  // Sales Statistics
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Sales Statistics', 15, yPos);
  yPos += 8;
  
  const statsData = [
    ['Total Sales', `ETB ${stats.totalSales?.toLocaleString() || 0}`],
    ['Transactions', `${stats.transactionCount || 0}`],
    ['Average Ticket', `ETB ${stats.averageTicket?.toLocaleString() || 0}`],
    ['Cash Sales', `ETB ${stats.cashSales?.toLocaleString() || 0}`],
    ['Chapa Sales', `ETB ${stats.chapaSales?.toLocaleString() || 0}`]
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: statsData,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { halign: 'right' }
    },
    margin: { left: 15 }
  });
  
  yPos = doc.lastAutoTable.finalY + 10;
  
  // Transactions Table
  if (transactions && transactions.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Transactions', 15, yPos);
    yPos += 5;
    
    const transactionRows = transactions.map(t => [
      new Date(t.created_at).toLocaleTimeString(),
      t.customer_name || 'Walk-in',
      `ETB ${t.amount}`,
      t.payment_method.toUpperCase(),
      t.status
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Time', 'Customer', 'Amount', 'Payment', 'Status']],
      body: transactionRows,
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      margin: { left: 15, right: 15 }
    });
  }
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  // Save the PDF
  doc.save(`pos-report-${date}.pdf`);
};

/**
 * Export POS report to CSV
 */
export const exportToCSV = (data) => {
  const { date, cashDrawer, stats, transactions } = data;
  
  // Prepare CSV data
  const csvData = [];
  
  // Header
  csvData.push(['ETHIOBUS - Point of Sale Report']);
  csvData.push([`Date: ${date}`]);
  csvData.push([`Generated: ${new Date().toLocaleString()}`]);
  csvData.push([]);
  
  // Cash Drawer Summary
  csvData.push(['CASH DRAWER SUMMARY']);
  csvData.push(['Opening Balance', `ETB ${cashDrawer.openingBalance?.toLocaleString() || 0}`]);
  csvData.push(['Total Sales', `ETB ${cashDrawer.totalSales?.toLocaleString() || 0}`]);
  csvData.push(['Cash Sales', `ETB ${cashDrawer.totalCash?.toLocaleString() || 0}`]);
  csvData.push(['Digital Payments', `ETB ${cashDrawer.totalChapa?.toLocaleString() || 0}`]);
  csvData.push(['Tickets Sold', cashDrawer.ticketsSold || 0]);
  csvData.push(['Current Balance', `ETB ${cashDrawer.currentBalance?.toLocaleString() || 0}`]);
  csvData.push(['Status', cashDrawer.status === 'open' ? 'OPEN' : 'CLOSED']);
  csvData.push([]);
  
  // Sales Statistics
  csvData.push(['SALES STATISTICS']);
  csvData.push(['Total Sales', `ETB ${stats.totalSales?.toLocaleString() || 0}`]);
  csvData.push(['Transactions', stats.transactionCount || 0]);
  csvData.push(['Average Ticket', `ETB ${stats.averageTicket?.toLocaleString() || 0}`]);
  csvData.push(['Cash Sales', `ETB ${stats.cashSales?.toLocaleString() || 0}`]);
  csvData.push(['Chapa Sales', `ETB ${stats.chapaSales?.toLocaleString() || 0}`]);
  csvData.push([]);
  
  // Transactions
  if (transactions && transactions.length > 0) {
    csvData.push(['TRANSACTIONS']);
    csvData.push(['Time', 'Customer', 'Amount', 'Payment Method', 'Status']);
    
    transactions.forEach(t => {
      csvData.push([
        new Date(t.created_at).toLocaleString(),
        t.customer_name || 'Walk-in',
        t.amount,
        t.payment_method.toUpperCase(),
        t.status
      ]);
    });
  }
  
  // Convert to CSV string
  const csv = Papa.unparse(csvData);
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pos-report-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Print ticket receipt
 */
export const printTicket = (booking) => {
  const printWindow = window.open('', '_blank');
  
  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ticket - ${booking.pnr_number}</title>
      <style>
        @media print {
          @page { margin: 0; }
          body { margin: 1cm; }
        }
        
        body {
          font-family: 'Courier New', monospace;
          max-width: 80mm;
          margin: 0 auto;
          padding: 10px;
          font-size: 12px;
        }
        
        .header {
          text-align: center;
          border-bottom: 2px dashed #000;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        
        .logo {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .company-info {
          font-size: 10px;
          margin-bottom: 5px;
        }
        
        .ticket-title {
          font-size: 16px;
          font-weight: bold;
          margin: 10px 0;
        }
        
        .section {
          margin: 10px 0;
          padding: 5px 0;
        }
        
        .row {
          display: flex;
          justify-content: space-between;
          margin: 3px 0;
        }
        
        .label {
          font-weight: bold;
        }
        
        .value {
          text-align: right;
        }
        
        .divider {
          border-top: 1px dashed #000;
          margin: 10px 0;
        }
        
        .footer {
          text-align: center;
          margin-top: 15px;
          padding-top: 10px;
          border-top: 2px dashed #000;
          font-size: 10px;
        }
        
        .barcode {
          text-align: center;
          font-size: 20px;
          font-weight: bold;
          letter-spacing: 2px;
          margin: 10px 0;
        }
        
        .important {
          background: #f0f0f0;
          padding: 5px;
          margin: 10px 0;
          border: 1px solid #000;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">ETHIOBUS</div>
        <div class="company-info">Ethiopian Bus Reservation System</div>
        <div class="company-info">Tel: +251-11-XXX-XXXX</div>
      </div>
      
      <div class="ticket-title">BUS TICKET</div>
      
      <div class="section">
        <div class="row">
          <span class="label">PNR:</span>
          <span class="value">${booking.pnr_number || 'N/A'}</span>
        </div>
        <div class="row">
          <span class="label">Booking Date:</span>
          <span class="value">${new Date(booking.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <div class="section">
        <div class="row">
          <span class="label">Passenger:</span>
          <span class="value">${booking.passenger_name || 'N/A'}</span>
        </div>
        <div class="row">
          <span class="label">Phone:</span>
          <span class="value">${booking.passenger_phone || 'N/A'}</span>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <div class="section">
        <div class="row">
          <span class="label">From:</span>
          <span class="value">${booking.departure_city || 'N/A'}</span>
        </div>
        <div class="row">
          <span class="label">To:</span>
          <span class="value">${booking.arrival_city || 'N/A'}</span>
        </div>
        <div class="row">
          <span class="label">Travel Date:</span>
          <span class="value">${booking.travel_date || 'N/A'}</span>
        </div>
        <div class="row">
          <span class="label">Departure:</span>
          <span class="value">${booking.departure_time || 'N/A'}</span>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <div class="section">
        <div class="row">
          <span class="label">Bus Number:</span>
          <span class="value">${booking.bus_number || 'N/A'}</span>
        </div>
        <div class="row">
          <span class="label">Bus Type:</span>
          <span class="value">${booking.bus_type || 'Standard'}</span>
        </div>
        <div class="row">
          <span class="label">Seat(s):</span>
          <span class="value">${Array.isArray(booking.seat_numbers) ? booking.seat_numbers.join(', ') : booking.seat_number || 'N/A'}</span>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <div class="section">
        <div class="row">
          <span class="label">Base Fare:</span>
          <span class="value">ETB ${booking.base_fare || 0}</span>
        </div>
        ${booking.baggage_fee > 0 ? `
        <div class="row">
          <span class="label">Baggage Fee:</span>
          <span class="value">ETB ${booking.baggage_fee}</span>
        </div>
        ` : ''}
        <div class="row">
          <span class="label">Total Amount:</span>
          <span class="value"><strong>ETB ${booking.total_amount || 0}</strong></span>
        </div>
        <div class="row">
          <span class="label">Payment:</span>
          <span class="value">${(booking.payment_method || 'cash').toUpperCase()}</span>
        </div>
        <div class="row">
          <span class="label">Status:</span>
          <span class="value">${(booking.payment_status || 'paid').toUpperCase()}</span>
        </div>
      </div>
      
      ${booking.baggage_tag ? `
      <div class="important">
        <div class="row">
          <span class="label">Baggage Tag:</span>
          <span class="value">${booking.baggage_tag}</span>
        </div>
      </div>
      ` : ''}
      
      <div class="barcode">${booking.pnr_number || ''}</div>
      
      <div class="footer">
        <p><strong>IMPORTANT NOTICE:</strong></p>
        <p>Please arrive 30 minutes before departure</p>
        <p>This ticket is non-transferable</p>
        <p>Keep this ticket for boarding</p>
        <p style="margin-top: 10px;">Thank you for choosing EthioBus!</p>
        <p style="margin-top: 5px;">Safe Journey!</p>
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.write(receiptHTML);
  printWindow.document.close();
  
  // Wait for content to load then print
  printWindow.onload = function() {
    printWindow.focus();
    printWindow.print();
    // Close after printing (optional)
    setTimeout(() => {
      printWindow.close();
    }, 100);
  };
};

/**
 * Print transaction receipt
 */
export const printReceipt = (transaction) => {
  const printWindow = window.open('', '_blank');
  
  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${transaction._id}</title>
      <style>
        @media print {
          @page { margin: 0; }
          body { margin: 1cm; }
        }
        
        body {
          font-family: 'Courier New', monospace;
          max-width: 80mm;
          margin: 0 auto;
          padding: 10px;
          font-size: 12px;
        }
        
        .header {
          text-align: center;
          border-bottom: 2px dashed #000;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        
        .logo {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .receipt-title {
          font-size: 16px;
          font-weight: bold;
          margin: 10px 0;
        }
        
        .row {
          display: flex;
          justify-content: space-between;
          margin: 5px 0;
        }
        
        .divider {
          border-top: 1px dashed #000;
          margin: 10px 0;
        }
        
        .footer {
          text-align: center;
          margin-top: 15px;
          padding-top: 10px;
          border-top: 2px dashed #000;
          font-size: 10px;
        }
        
        .total {
          font-size: 16px;
          font-weight: bold;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">ETHIOBUS</div>
        <div>Ethiopian Bus Reservation</div>
      </div>
      
      <div class="receipt-title">PAYMENT RECEIPT</div>
      
      <div class="row">
        <span>Receipt #:</span>
        <span>${transaction._id}</span>
      </div>
      <div class="row">
        <span>Date:</span>
        <span>${new Date(transaction.created_at).toLocaleString()}</span>
      </div>
      
      <div class="divider"></div>
      
      <div class="row">
        <span>Customer:</span>
        <span>${transaction.customer_name || 'Walk-in'}</span>
      </div>
      ${transaction.customer_phone ? `
      <div class="row">
        <span>Phone:</span>
        <span>${transaction.customer_phone}</span>
      </div>
      ` : ''}
      
      <div class="divider"></div>
      
      <div class="row total">
        <span>TOTAL:</span>
        <span>ETB ${transaction.amount}</span>
      </div>
      
      <div class="row">
        <span>Payment Method:</span>
        <span>${transaction.payment_method.toUpperCase()}</span>
      </div>
      <div class="row">
        <span>Status:</span>
        <span>${transaction.status.toUpperCase()}</span>
      </div>
      
      <div class="footer">
        <p>Thank you for your business!</p>
        <p>EthioBus - Your Trusted Travel Partner</p>
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.write(receiptHTML);
  printWindow.document.close();
  
  printWindow.onload = function() {
    printWindow.focus();
    printWindow.print();
    setTimeout(() => {
      printWindow.close();
    }, 100);
  };
};
