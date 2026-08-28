const line = "[img-123]: data:image/png;base64,iVBORw0KGgo";
const refMatch = line.match(/^\[(.*?)\]:\s*(.+)$/);
console.log(refMatch[1], refMatch[2].substring(0, 20));
