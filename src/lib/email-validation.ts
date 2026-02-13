const ALLOWED_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "outlook.in",
  "yahoo.com",
  "yahoo.in",
  "zohomail.in",
];

export const validateEmailFormat = (email: string): string | null => {
  if (!email.trim()) return null;
  if (!email.includes("@")) return "Please enter a valid email with @ included";
  
  const parts = email.split("@");
  if (parts.length !== 2 || !parts[1]) return "Please enter a valid email address";
  
  const domain = parts[1].toLowerCase();
  if (!ALLOWED_DOMAINS.includes(domain)) {
    return `Only these email providers are allowed: ${ALLOWED_DOMAINS.join(", ")}`;
  }
  
  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return "Please enter a valid email address";
  
  return null;
};

export const isEmailValid = (email: string): boolean => {
  return validateEmailFormat(email) === null && email.trim().length > 0;
};
