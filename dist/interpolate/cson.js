var isBeginOfBracket, isBracket, isCRLF, isEndOfBracket, isEndOfDQuote, isEndOfSQuote, isName, isNameSeparator, isWS, stringToLiteral, tokenize;

isName = function(char) {
  return !/\s|,|:|=|"|'|\[|\{|\]|\}|#/.test(char);
};

isWS = function(char) {
  return /\s/.test(char);
};

isCRLF = function(char, nextChar) {
  return char === '\r' && nextChar === '\n';
};

isNameSeparator = function(char) {
  return char === ':' || char === '=';
};

isEndOfDQuote = function(prevChar, char) {
  return prevChar !== '\\' && char === '"';
};

isEndOfSQuote = function(prevChar, char) {
  return prevChar !== '\\' && char === '\'';
};

isBeginOfBracket = function(char) {
  return char === '[' || char === '{';
};

isEndOfBracket = function(char) {
  return char === ']' || char === '}';
};

isBracket = function(char) {
  return isBeginOfBracket(char) || isEndOfBracket(char);
};

stringToLiteral = function(str) {
  return str.replace(/([-()[\]{}+?*.$^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08');
};

tokenize = function(text) {
  var buffer, currentChar, escapeCount, i, isSQuote, nextChar, prevChar, tokens, verbatimBuffer, verbatimExit;
  tokens = [];
  i = 0;
  while (i < text.length) {
    currentChar = text.charAt(i);
    prevChar = text.charAt(i - 1);
    nextChar = text.charAt(i + 1);
    if (isBracket(currentChar)) {
      tokens.push(currentChar);
    } else if (currentChar === ',' || currentChar === '\n') {
      ++i;
      continue;
    } else if (isCRLF(currentChar, nextChar)) {
      ++i;
    } else if (isNameSeparator(currentChar)) {
      tokens.push(':');
    } else if (currentChar === '"' || currentChar === '\'') {
      buffer = '';
      isSQuote = currentChar === '\'';
      escapeCount = 0;
      currentChar = text.charAt(++i);
      prevChar = text.charAt(i - 1);
      while (!(isSQuote ? isEndOfSQuote(prevChar, currentChar) : isEndOfDQuote(prevChar, currentChar)) && i < text.length) {
        if (isSQuote && currentChar === '"' && escapeCount % 2 === 0) {
          buffer += '\\';
        }
        buffer += currentChar;
        escapeCount = currentChar === '\\' ? escapeCount + 1 : 0;
        currentChar = text.charAt(++i);
        prevChar = text.charAt(i - 1);
      }
      tokens.push('"' + buffer + '"');
    } else if (currentChar === '|') {
      buffer = '';
      verbatimBuffer = [];
      verbatimExit = false;
      while (i < text.length) {
        currentChar = text.charAt(++i);
        nextChar = text.charAt(i + 1);
        if (verbatimExit) {
          if (currentChar === '|') {
            verbatimExit = false;
            ++i;
            continue;
          } else if (isCRLF(currentChar, nextChar)) {
            ++i;
            break;
          } else if (currentChar === '\n') {
            break;
          } else if (!isWS(currentChar)) {
            --i;
            break;
          }
        } else if (isCRLF(currentChar, nextChar)) {
          ++i;
          verbatimBuffer.push(stringToLiteral(buffer));
          buffer = '';
          verbatimExit = true;
        } else if (currentChar === '\n') {
          verbatimBuffer.push(stringToLiteral(buffer));
          buffer = '';
          verbatimExit = true;
        } else {
          buffer += currentChar;
        }
      }
      if (!verbatimExit) {
        verbatimBuffer.push(stringToLiteral(buffer));
      }
      buffer = '';
      tokens.push('"' + verbatimBuffer.join('\\n') + '"');
    } else if (currentChar === '#') {
      while (i < text.length) {
        currentChar = text.charAt(++i);
        nextChar = text.charAt(i + 1);
        if (currentChar === '\n') {
          break;
        } else if (isCRLF(currentChar, nextChar)) {
          ++i;
          break;
        }
      }
    } else if (isWS(currentChar)) {
      while (isWS(currentChar) && i < text.length) {
        currentChar = text.charAt(++i);
      }
      --i;
    } else {
      if (!isName(nextChar)) {
        tokens.push(currentChar);
        ++i;
        continue;
      }
      buffer = currentChar;
      while (i < text.length) {
        currentChar = text.charAt(++i);
        nextChar = text.charAt(i + 1);
        buffer += currentChar;
        if (!isName(nextChar)) {
          break;
        }
      }
      tokens.push(buffer);
    }
    ++i;
  }
  return tokens;
};

exports.parse = function(text) {
  var i, isCloseBracket, isOpenBracket, nextToken, token, tokens;
  if (!isBracket(text)) {
    return text;
  }
  tokens = tokenize(String(text));
  if (!isBeginOfBracket(tokens[0]) && tokens[1] !== void 0) {
    if (tokens[1] === ':') {
      tokens.unshift('{');
      tokens.push('}');
    } else {
      tokens.unshift('[');
      tokens.push(']');
    }
  }
  i = 0;
  while (i < tokens.length) {
    token = tokens[i];
    nextToken = tokens[i + 1];
    if (isName(token.charAt()) && tokens[i + 1] === ':') {
      tokens[i] = '"' + tokens[i] + '"';
    }
    isOpenBracket = /\[|\{|:/.test(tokens[i].charAt());
    if (nextToken) {
      isCloseBracket = /\]|\}|:/.test(nextToken.charAt());
    }
    if (!isOpenBracket && !isCloseBracket) {
      tokens[i] += ',';
    }
    ++i;
  }
  try {
    return JSON.parse(tokens.join(''));
  } catch (error) {
    return text;
  }
};
