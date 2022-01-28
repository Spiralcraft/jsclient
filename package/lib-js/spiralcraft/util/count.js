const count = 
  (a, condition) => a.reduce((count, val) => condition(val) ? ++count : count, 0);  

export { count };
