// Script to convert a hex private key to an nsec key
const crypto = require('crypto');

// Bech32 implementation
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function polymod(values) {
  let chk = 1;
  for (let p = 0; p < values.length; ++p) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ values[p];
    for (let i = 0; i < 5; ++i) {
      if ((top >> i) & 1) {
        chk ^= GENERATOR[i];
      }
    }
  }
  return chk;
}

function hrpExpand(hrp) {
  const ret = [];
  let p;
  for (p = 0; p < hrp.length; ++p) {
    ret.push(hrp.charCodeAt(p) >> 5);
  }
  ret.push(0);
  for (p = 0; p < hrp.length; ++p) {
    ret.push(hrp.charCodeAt(p) & 31);
  }
  return ret;
}

function verifyChecksum(hrp, data) {
  return polymod(hrpExpand(hrp).concat(data)) === 1;
}

function createChecksum(hrp, data) {
  const values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const mod = polymod(values) ^ 1;
  const ret = [];
  for (let p = 0; p < 6; ++p) {
    ret.push((mod >> 5 * (5 - p)) & 31);
  }
  return ret;
}

function convertBits(data, fromBits, toBits, pad) {
  let acc = 0;
  let bits = 0;
  const ret = [];
  const maxv = (1 << toBits) - 1;
  for (let p = 0; p < data.length; ++p) {
    const value = data[p];
    if (value < 0 || value >> fromBits !== 0) {
      return null;
    }
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) {
      ret.push((acc << (toBits - bits)) & maxv);
    }
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) {
    return null;
  }
  return ret;
}

function encode(hrp, data) {
  const combined = data.concat(createChecksum(hrp, data));
  let ret = hrp + '1';
  for (let p = 0; p < combined.length; ++p) {
    ret += CHARSET.charAt(combined[p]);
  }
  return ret;
}

function hexToUint8Array(hexString) {
  if (hexString.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const arrayBuffer = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    const byteValue = parseInt(hexString.substring(i, i + 2), 16);
    arrayBuffer[i / 2] = byteValue;
  }
  return arrayBuffer;
}

function hexToNsec(hexPrivateKey) {
  // Convert hex to Uint8Array
  const bytes = hexToUint8Array(hexPrivateKey);
  
  // Convert 8-bit array to 5-bit array
  const words = convertBits(Array.from(bytes), 8, 5, true);
  
  // Encode with bech32
  const nsecKey = encode('nsec', words);
  
  return nsecKey;
}

// The hex private key to convert
const hexKey = '3515e07c0146d6cb91286ae96559668b498529bc41a44179793e516f00b62ec8';
const nsecKey = hexToNsec(hexKey);
console.log(`Hex key: ${hexKey}`);
console.log(`nsec key: ${nsecKey}`);