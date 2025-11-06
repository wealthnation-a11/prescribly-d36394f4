declare module 'jspdf-autotable' {
  const content: any;
  export default content;
}

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}
