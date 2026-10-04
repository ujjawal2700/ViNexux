const BLOCKED_ELEMENTS = ['script', 'iframe', 'object', 'embed', 'form', 'base'];
const URL_ATTRIBUTES = ['href', 'src', 'xlink:href'];

export const sanitizeHtml = (html = '') => {
  if (typeof window === 'undefined' || !html) return '';
  const documentNode = new DOMParser().parseFromString(String(html), 'text/html');

  documentNode.querySelectorAll(BLOCKED_ELEMENTS.join(',')).forEach((element) => element.remove());
  documentNode.querySelectorAll('*').forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc' || (URL_ATTRIBUTES.includes(name) && (value.startsWith('javascript:') || value.startsWith('data:text/html')))) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return documentNode.body.innerHTML;
};

export default sanitizeHtml;
