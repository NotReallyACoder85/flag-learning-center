export const cap = (s) => s[0].toUpperCase() + s.slice(1);

/** "a Slant", "an Out". */
export const withArticle = (word) => (/^[aeiou]/i.test(word) ? 'an ' : 'a ') + word;
