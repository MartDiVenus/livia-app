const str = "![alt][ref_name]";
const refMatch = str.match(/^!\[(.*?)\]\[(.*?)\]/);
console.log(refMatch);
