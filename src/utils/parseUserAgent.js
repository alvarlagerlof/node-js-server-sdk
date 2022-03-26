const uaparser = require('ua-parser-js');

// This exists only to provide compatibility for useragent library that's used
// everywhere else.
function parseUserAgent(uaString) {
  const res = uaparser(uaString);
  if (res.os.name === 'Mac OS') {
    res.os.name = 'Mac OS X';
  }
  if (
    (res.browser.name === 'Chrome' || res.browser.name === 'Firefox') &&
    (res.device.type === 'mobile' || res.device.type === 'tablet')
  ) {
    res.browser.name += ' Mobile';
  }
  return res;
}

module.exports = parseUserAgent;