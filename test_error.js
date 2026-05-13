function fetchData(userId) {
  // Simulating an undefined property access
  const config = null;
  return config.url + userId;
}

try {
  fetchData('123');
} catch (err) {
  console.error('TypeError: Cannot read properties of null (reading \'url\')');
  console.error('    at fetchData (server.js:4:17)');
  console.error('    at Object.<anonymous> (server.js:8:3)');
}

const user = {};
if (!user.profile.name) {
  console.log('ReferenceError: profile is not defined');
}
