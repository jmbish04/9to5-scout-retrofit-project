/**
 * @fileoverview Crypto Helper Utilities
 *
 * Utility functions for cryptographic operations, hashing, and security
 * across all domains in the 9to5 Scout platform.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * Crypto utility functions
 */
export class CryptoUtils {
  /**
   * Generates a random UUID v4
   * @returns Random UUID string
   */
  static generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Generates a random string of specified length
   * @param length Length of the string
   * @param charset Character set to use
   * @returns Random string
   */
  static randomString(
    length: number,
    charset: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  ): string {
    let result = "";
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
      result += charset[array[i] % charset.length];
    }

    return result;
  }

  /**
   * Generates a random alphanumeric string
   * @param length Length of the string
   * @returns Random alphanumeric string
   */
  static randomAlphanumeric(length: number): string {
    return this.randomString(
      length,
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    );
  }

  /**
   * Generates a random numeric string
   * @param length Length of the string
   * @returns Random numeric string
   */
  static randomNumeric(length: number): string {
    return this.randomString(length, "0123456789");
  }

  /**
   * Generates a random alphabetic string
   * @param length Length of the string
   * @returns Random alphabetic string
   */
  static randomAlphabetic(length: number): string {
    return this.randomString(
      length,
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    );
  }

  /**
   * Generates a random hex string
   * @param length Length of the string
   * @returns Random hex string
   */
  static randomHex(length: number): string {
    return this.randomString(length, "0123456789abcdef");
  }

  /**
   * Generates a random base64 string
   * @param length Length of the string
   * @returns Random base64 string
   */
  static randomBase64(length: number): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  /**
   * Generates a random password
   * @param length Length of the password
   * @param options Password generation options
   * @returns Random password
   */
  static generatePassword(
    length: number,
    options: {
      includeUppercase?: boolean;
      includeLowercase?: boolean;
      includeNumbers?: boolean;
      includeSymbols?: boolean;
      excludeSimilar?: boolean;
    } = {}
  ): string {
    const {
      includeUppercase = true,
      includeLowercase = true,
      includeNumbers = true,
      includeSymbols = false,
      excludeSimilar = true,
    } = options;

    let charset = "";

    if (includeUppercase) {
      charset += excludeSimilar
        ? "ABCDEFGHJKLMNPQRSTUVWXYZ"
        : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    }

    if (includeLowercase) {
      charset += excludeSimilar
        ? "abcdefghijkmnpqrstuvwxyz"
        : "abcdefghijklmnopqrstuvwxyz";
    }

    if (includeNumbers) {
      charset += excludeSimilar ? "23456789" : "0123456789";
    }

    if (includeSymbols) {
      charset += "!@#$%^&*()_+-=[]{}|;:,.<>?";
    }

    if (!charset) {
      throw new Error("At least one character type must be included");
    }

    return this.randomString(length, charset);
  }

  /**
   * Generates a random API key
   * @param length Length of the API key
   * @returns Random API key
   */
  static generateApiKey(length: number = 32): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random session token
   * @param length Length of the session token
   * @returns Random session token
   */
  static generateSessionToken(length: number = 64): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random CSRF token
   * @param length Length of the CSRF token
   * @returns Random CSRF token
   */
  static generateCSRFToken(length: number = 32): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random nonce
   * @param length Length of the nonce
   * @returns Random nonce
   */
  static generateNonce(length: number = 16): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random salt
   * @param length Length of the salt
   * @returns Random salt
   */
  static generateSalt(length: number = 16): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random IV (Initialization Vector)
   * @param length Length of the IV
   * @returns Random IV
   */
  static generateIV(length: number = 16): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random key
   * @param length Length of the key
   * @returns Random key
   */
  static generateKey(length: number = 32): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random secret
   * @param length Length of the secret
   * @returns Random secret
   */
  static generateSecret(length: number = 64): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random token
   * @param length Length of the token
   * @returns Random token
   */
  static generateToken(length: number = 32): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random ID
   * @param length Length of the ID
   * @returns Random ID
   */
  static generateID(length: number = 16): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random code
   * @param length Length of the code
   * @returns Random code
   */
  static generateCode(length: number = 6): string {
    return this.randomNumeric(length);
  }

  /**
   * Generates a random PIN
   * @param length Length of the PIN
   * @returns Random PIN
   */
  static generatePIN(length: number = 4): string {
    return this.randomNumeric(length);
  }

  /**
   * Generates a random OTP (One-Time Password)
   * @param length Length of the OTP
   * @returns Random OTP
   */
  static generateOTP(length: number = 6): string {
    return this.randomNumeric(length);
  }

  /**
   * Generates a random verification code
   * @param length Length of the verification code
   * @returns Random verification code
   */
  static generateVerificationCode(length: number = 6): string {
    return this.randomNumeric(length);
  }

  /**
   * Generates a random confirmation code
   * @param length Length of the confirmation code
   * @returns Random confirmation code
   */
  static generateConfirmationCode(length: number = 6): string {
    return this.randomNumeric(length);
  }

  /**
   * Generates a random activation code
   * @param length Length of the activation code
   * @returns Random activation code
   */
  static generateActivationCode(length: number = 6): string {
    return this.randomNumeric(length);
  }

  /**
   * Generates a random recovery code
   * @param length Length of the recovery code
   * @returns Random recovery code
   */
  static generateRecoveryCode(length: number = 8): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random backup code
   * @param length Length of the backup code
   * @returns Random backup code
   */
  static generateBackupCode(length: number = 8): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random access code
   * @param length Length of the access code
   * @returns Random access code
   */
  static generateAccessCode(length: number = 8): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random invitation code
   * @param length Length of the invitation code
   * @returns Random invitation code
   */
  static generateInvitationCode(length: number = 8): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random referral code
   * @param length Length of the referral code
   * @returns Random referral code
   */
  static generateReferralCode(length: number = 8): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random promo code
   * @param length Length of the promo code
   * @returns Random promo code
   */
  static generatePromoCode(length: number = 8): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random coupon code
   * @param length Length of the coupon code
   * @returns Random coupon code
   */
  static generateCouponCode(length: number = 8): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random discount code
   * @param length Length of the discount code
   * @returns Random discount code
   */
  static generateDiscountCode(length: number = 8): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random voucher code
   * @param length Length of the voucher code
   * @returns Random voucher code
   */
  static generateVoucherCode(length: number = 8): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random gift code
   * @param length Length of the gift code
   * @returns Random gift code
   */
  static generateGiftCode(length: number = 8): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random license code
   * @param length Length of the license code
   * @returns Random license code
   */
  static generateLicenseCode(length: number = 16): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random serial number
   * @param length Length of the serial number
   * @returns Random serial number
   */
  static generateSerialNumber(length: number = 16): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random part number
   * @param length Length of the part number
   * @returns Random part number
   */
  static generatePartNumber(length: number = 12): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random SKU
   * @param length Length of the SKU
   * @returns Random SKU
   */
  static generateSKU(length: number = 12): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random barcode
   * @param length Length of the barcode
   * @returns Random barcode
   */
  static generateBarcode(length: number = 12): string {
    return this.randomNumeric(length);
  }

  /**
   * Generates a random QR code
   * @param length Length of the QR code
   * @returns Random QR code
   */
  static generateQRCode(length: number = 16): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random hash
   * @param length Length of the hash
   * @returns Random hash
   */
  static generateHash(length: number = 32): string {
    return this.randomHex(length);
  }

  /**
   * Generates a random checksum
   * @param length Length of the checksum
   * @returns Random checksum
   */
  static generateChecksum(length: number = 8): string {
    return this.randomHex(length);
  }

  /**
   * Generates a random signature
   * @param length Length of the signature
   * @returns Random signature
   */
  static generateSignature(length: number = 64): string {
    return this.randomHex(length);
  }

  /**
   * Generates a random fingerprint
   * @param length Length of the fingerprint
   * @returns Random fingerprint
   */
  static generateFingerprint(length: number = 32): string {
    return this.randomHex(length);
  }

  /**
   * Generates a random digest
   * @param length Length of the digest
   * @returns Random digest
   */
  static generateDigest(length: number = 32): string {
    return this.randomHex(length);
  }

  /**
   * Generates a random MAC address
   * @returns Random MAC address
   */
  static generateMACAddress(): string {
    const parts = [];
    for (let i = 0; i < 6; i++) {
      parts.push(this.randomHex(2));
    }
    return parts.join(":");
  }

  /**
   * Generates a random IP address
   * @returns Random IP address
   */
  static generateIPAddress(): string {
    const parts = [];
    for (let i = 0; i < 4; i++) {
      parts.push(Math.floor(Math.random() * 256));
    }
    return parts.join(".");
  }

  /**
   * Generates a random port number
   * @param min Minimum port number
   * @param max Maximum port number
   * @returns Random port number
   */
  static generatePortNumber(min: number = 1024, max: number = 65535): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generates a random hostname
   * @param length Length of the hostname
   * @returns Random hostname
   */
  static generateHostname(length: number = 12): string {
    return this.randomAlphanumeric(length).toLowerCase();
  }

  /**
   * Generates a random domain name
   * @param length Length of the domain name
   * @param tld Top-level domain
   * @returns Random domain name
   */
  static generateDomainName(length: number = 12, tld: string = "com"): string {
    return `${this.randomAlphanumeric(length).toLowerCase()}.${tld}`;
  }

  /**
   * Generates a random email address
   * @param length Length of the email username
   * @param domain Email domain
   * @returns Random email address
   */
  static generateEmailAddress(
    length: number = 8,
    domain: string = "example.com"
  ): string {
    return `${this.randomAlphanumeric(length).toLowerCase()}@${domain}`;
  }

  /**
   * Generates a random username
   * @param length Length of the username
   * @returns Random username
   */
  static generateUsername(length: number = 8): string {
    return this.randomAlphanumeric(length).toLowerCase();
  }

  /**
   * Generates a random display name
   * @param length Length of the display name
   * @returns Random display name
   */
  static generateDisplayName(length: number = 12): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random company name
   * @param length Length of the company name
   * @returns Random company name
   */
  static generateCompanyName(length: number = 12): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random product name
   * @param length Length of the product name
   * @returns Random product name
   */
  static generateProductName(length: number = 12): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random service name
   * @param length Length of the service name
   * @returns Random service name
   */
  static generateServiceName(length: number = 12): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random category name
   * @param length Length of the category name
   * @returns Random category name
   */
  static generateCategoryName(length: number = 12): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random tag name
   * @param length Length of the tag name
   * @returns Random tag name
   */
  static generateTagName(length: number = 8): string {
    return this.randomAlphanumeric(length).toLowerCase();
  }

  /**
   * Generates a random keyword
   * @param length Length of the keyword
   * @returns Random keyword
   */
  static generateKeyword(length: number = 8): string {
    return this.randomAlphanumeric(length).toLowerCase();
  }

  /**
   * Generates a random description
   * @param length Length of the description
   * @returns Random description
   */
  static generateDescription(length: number = 50): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random title
   * @param length Length of the title
   * @returns Random title
   */
  static generateTitle(length: number = 20): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random subtitle
   * @param length Length of the subtitle
   * @returns Random subtitle
   */
  static generateSubtitle(length: number = 15): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random caption
   * @param length Length of the caption
   * @returns Random caption
   */
  static generateCaption(length: number = 30): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random comment
   * @param length Length of the comment
   * @returns Random comment
   */
  static generateComment(length: number = 100): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random note
   * @param length Length of the note
   * @returns Random note
   */
  static generateNote(length: number = 50): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random message
   * @param length Length of the message
   * @returns Random message
   */
  static generateMessage(length: number = 100): string {
    return this.randomAlphanumeric(length);
  }

  /**
   * Generates a random status
   * @param statuses Array of possible statuses
   * @returns Random status
   */
  static generateStatus(
    statuses: string[] = [
      "active",
      "inactive",
      "pending",
      "completed",
      "failed",
    ]
  ): string {
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  /**
   * Generates a random priority
   * @param priorities Array of possible priorities
   * @returns Random priority
   */
  static generatePriority(
    priorities: string[] = ["low", "medium", "high", "urgent"]
  ): string {
    return priorities[Math.floor(Math.random() * priorities.length)];
  }

  /**
   * Generates a random type
   * @param types Array of possible types
   * @returns Random type
   */
  static generateType(
    types: string[] = ["user", "admin", "moderator", "guest"]
  ): string {
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Generates a random role
   * @param roles Array of possible roles
   * @returns Random role
   */
  static generateRole(
    roles: string[] = ["user", "admin", "moderator", "guest"]
  ): string {
    return roles[Math.floor(Math.random() * roles.length)];
  }

  /**
   * Generates a random permission
   * @param permissions Array of possible permissions
   * @returns Random permission
   */
  static generatePermission(
    permissions: string[] = ["read", "write", "delete", "admin"]
  ): string {
    return permissions[Math.floor(Math.random() * permissions.length)];
  }

  /**
   * Generates a random scope
   * @param scopes Array of possible scopes
   * @returns Random scope
   */
  static generateScope(scopes: string[] = ["read", "write", "admin"]): string {
    return scopes[Math.floor(Math.random() * scopes.length)];
  }

  /**
   * Generates a random action
   * @param actions Array of possible actions
   * @returns Random action
   */
  static generateAction(
    actions: string[] = ["create", "read", "update", "delete"]
  ): string {
    return actions[Math.floor(Math.random() * actions.length)];
  }

  /**
   * Generates a random event
   * @param events Array of possible events
   * @returns Random event
   */
  static generateEvent(
    events: string[] = ["created", "updated", "deleted", "viewed"]
  ): string {
    return events[Math.floor(Math.random() * events.length)];
  }

  /**
   * Generates a random state
   * @param states Array of possible states
   * @returns Random state
   */
  static generateState(
    states: string[] = ["draft", "published", "archived", "deleted"]
  ): string {
    return states[Math.floor(Math.random() * states.length)];
  }

  /**
   * Generates a random phase
   * @param phases Array of possible phases
   * @returns Random phase
   */
  static generatePhase(
    phases: string[] = ["planning", "development", "testing", "production"]
  ): string {
    return phases[Math.floor(Math.random() * phases.length)];
  }

  /**
   * Generates a random stage
   * @param stages Array of possible stages
   * @returns Random stage
   */
  static generateStage(
    stages: string[] = ["initial", "progress", "review", "complete"]
  ): string {
    return stages[Math.floor(Math.random() * stages.length)];
  }

  /**
   * Generates a random level
   * @param levels Array of possible levels
   * @returns Random level
   */
  static generateLevel(
    levels: string[] = ["beginner", "intermediate", "advanced", "expert"]
  ): string {
    return levels[Math.floor(Math.random() * levels.length)];
  }

  /**
   * Generates a random grade
   * @param grades Array of possible grades
   * @returns Random grade
   */
  static generateGrade(grades: string[] = ["A", "B", "C", "D", "F"]): string {
    return grades[Math.floor(Math.random() * grades.length)];
  }

  /**
   * Generates a random rating
   * @param min Minimum rating
   * @param max Maximum rating
   * @returns Random rating
   */
  static generateRating(min: number = 1, max: number = 5): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generates a random score
   * @param min Minimum score
   * @param max Maximum score
   * @returns Random score
   */
  static generateScore(min: number = 0, max: number = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generates a random percentage
   * @param min Minimum percentage
   * @param max Maximum percentage
   * @returns Random percentage
   */
  static generatePercentage(min: number = 0, max: number = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generates a random probability
   * @returns Random probability (0-1)
   */
  static generateProbability(): number {
    return Math.random();
  }

  /**
   * Generates a random boolean
   * @returns Random boolean
   */
  static generateBoolean(): boolean {
    return Math.random() < 0.5;
  }

  /**
   * Generates a random integer
   * @param min Minimum value
   * @param max Maximum value
   * @returns Random integer
   */
  static generateInteger(min: number = 0, max: number = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generates a random float
   * @param min Minimum value
   * @param max Maximum value
   * @param decimals Number of decimal places
   * @returns Random float
   */
  static generateFloat(
    min: number = 0,
    max: number = 100,
    decimals: number = 2
  ): number {
    const value = Math.random() * (max - min) + min;
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Generates a random date
   * @param start Start date
   * @param end End date
   * @returns Random date
   */
  static generateDate(
    start: Date = new Date(2020, 0, 1),
    end: Date = new Date()
  ): Date {
    const startTime = start.getTime();
    const endTime = end.getTime();
    const randomTime = startTime + Math.random() * (endTime - startTime);
    return new Date(randomTime);
  }

  /**
   * Generates a random time
   * @returns Random time string (HH:MM:SS)
   */
  static generateTime(): string {
    const hours = Math.floor(Math.random() * 24)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor(Math.random() * 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(Math.random() * 60)
      .toString()
      .padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Generates a random color
   * @returns Random color string (hex)
   */
  static generateColor(): string {
    return `#${this.randomHex(6)}`;
  }

  /**
   * Generates a random URL
   * @param protocol URL protocol
   * @param domain URL domain
   * @param path URL path
   * @returns Random URL
   */
  static generateURL(
    protocol: string = "https",
    domain: string = "example.com",
    path: string = "/"
  ): string {
    return `${protocol}://${domain}${path}`;
  }

  /**
   * Generates a random path
   * @param length Length of the path
   * @returns Random path
   */
  static generatePath(length: number = 3): string {
    const segments = [];
    for (let i = 0; i < length; i++) {
      segments.push(this.randomAlphanumeric(8).toLowerCase());
    }
    return `/${segments.join("/")}`;
  }

  /**
   * Generates a random query string
   * @param params Number of query parameters
   * @returns Random query string
   */
  static generateQueryString(params: number = 3): string {
    const queryParams = [];
    for (let i = 0; i < params; i++) {
      const key = this.randomAlphanumeric(8).toLowerCase();
      const value = this.randomAlphanumeric(8).toLowerCase();
      queryParams.push(`${key}=${value}`);
    }
    return `?${queryParams.join("&")}`;
  }

  /**
   * Generates a random fragment
   * @param length Length of the fragment
   * @returns Random fragment
   */
  static generateFragment(length: number = 8): string {
    return `#${this.randomAlphanumeric(length).toLowerCase()}`;
  }

  /**
   * Generates a random user agent
   * @returns Random user agent string
   */
  static generateUserAgent(): string {
    const browsers = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0",
      "Mozilla/5.0 (X11; Linux x86_64; rv:89.0) Gecko/20100101 Firefox/89.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/91.0.864.59",
    ];

    return browsers[Math.floor(Math.random() * browsers.length)];
  }

  /**
   * Generates a random referer
   * @returns Random referer URL
   */
  static generateReferer(): string {
    const domains = [
      "google.com",
      "bing.com",
      "yahoo.com",
      "duckduckgo.com",
      "baidu.com",
    ];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `https://${domain}/search?q=${this.randomAlphanumeric(
      10
    ).toLowerCase()}`;
  }

  /**
   * Generates a random origin
   * @returns Random origin URL
   */
  static generateOrigin(): string {
    const protocols = ["https", "http"];
    const domains = ["example.com", "test.com", "demo.com", "sample.com"];
    const protocol = protocols[Math.floor(Math.random() * protocols.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${protocol}://${domain}`;
  }

  /**
   * Generates a random header
   * @param name Header name
   * @returns Random header value
   */
  static generateHeader(name: string): string {
    switch (name.toLowerCase()) {
      case "accept":
        return "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8";
      case "accept-language":
        return "en-US,en;q=0.5";
      case "accept-encoding":
        return "gzip, deflate, br";
      case "user-agent":
        return this.generateUserAgent();
      case "referer":
        return this.generateReferer();
      case "origin":
        return this.generateOrigin();
      case "content-type":
        return "application/json";
      case "authorization":
        return `Bearer ${this.generateToken(32)}`;
      case "x-api-key":
        return this.generateApiKey(32);
      case "x-csrf-token":
        return this.generateCSRFToken(32);
      case "x-request-id":
        return this.generateUUID();
      case "x-correlation-id":
        return this.generateUUID();
      case "x-trace-id":
        return this.generateUUID();
      case "x-span-id":
        return this.generateUUID();
      case "x-parent-span-id":
        return this.generateUUID();
      case "x-session-id":
        return this.generateSessionToken(32);
      case "x-user-id":
        return this.generateUUID();
      case "x-tenant-id":
        return this.generateUUID();
      case "x-organization-id":
        return this.generateUUID();
      case "x-team-id":
        return this.generateUUID();
      case "x-project-id":
        return this.generateUUID();
      case "x-environment":
        return ["development", "staging", "production"][
          Math.floor(Math.random() * 3)
        ];
      case "x-version":
        return `${Math.floor(Math.random() * 10)}.${Math.floor(
          Math.random() * 10
        )}.${Math.floor(Math.random() * 10)}`;
      case "x-timestamp":
        return new Date().toISOString();
      case "x-timezone":
        return "UTC";
      case "x-locale":
        return "en-US";
      case "x-currency":
        return "USD";
      case "x-country":
        return "US";
      case "x-region":
        return "us-east-1";
      case "x-zone":
        return "us-east-1a";
      case "x-instance":
        return this.generateHostname(8);
      case "x-service":
        return this.generateServiceName(8);
      case "x-component":
        return this.generateProductName(8);
      case "x-module":
        return this.generateCategoryName(8);
      case "x-feature":
        return this.generateTagName(8);
      case "x-capability":
        return this.generateKeyword(8);
      case "x-permission":
        return this.generatePermission();
      case "x-role":
        return this.generateRole();
      case "x-scope":
        return this.generateScope();
      case "x-action":
        return this.generateAction();
      case "x-event":
        return this.generateEvent();
      case "x-state":
        return this.generateState();
      case "x-phase":
        return this.generatePhase();
      case "x-stage":
        return this.generateStage();
      case "x-level":
        return this.generateLevel();
      case "x-grade":
        return this.generateGrade();
      case "x-rating":
        return this.generateRating().toString();
      case "x-score":
        return this.generateScore().toString();
      case "x-percentage":
        return this.generatePercentage().toString();
      case "x-probability":
        return this.generateProbability().toString();
      case "x-boolean":
        return this.generateBoolean().toString();
      case "x-integer":
        return this.generateInteger().toString();
      case "x-float":
        return this.generateFloat().toString();
      case "x-date":
        return this.generateDate().toISOString();
      case "x-time":
        return this.generateTime();
      case "x-color":
        return this.generateColor();
      case "x-url":
        return this.generateURL();
      case "x-path":
        return this.generatePath();
      case "x-query":
        return this.generateQueryString();
      case "x-fragment":
        return this.generateFragment();
      default:
        return this.randomAlphanumeric(16);
    }
  }

  /**
   * Generates a random headers object
   * @param count Number of headers to generate
   * @returns Random headers object
   */
  static generateHeaders(count: number = 10): Record<string, string> {
    const headers: Record<string, string> = {};
    const headerNames = [
      "Accept",
      "Accept-Language",
      "Accept-Encoding",
      "User-Agent",
      "Referer",
      "Origin",
      "Content-Type",
      "Authorization",
      "X-API-Key",
      "X-CSRF-Token",
      "X-Request-ID",
      "X-Correlation-ID",
      "X-Trace-ID",
      "X-Span-ID",
      "X-Parent-Span-ID",
      "X-Session-ID",
      "X-User-ID",
      "X-Tenant-ID",
      "X-Organization-ID",
      "X-Team-ID",
      "X-Project-ID",
      "X-Environment",
      "X-Version",
      "X-Timestamp",
      "X-Timezone",
      "X-Locale",
      "X-Currency",
      "X-Country",
      "X-Region",
      "X-Zone",
      "X-Instance",
      "X-Service",
      "X-Component",
      "X-Module",
      "X-Feature",
      "X-Capability",
      "X-Permission",
      "X-Role",
      "X-Scope",
      "X-Action",
      "X-Event",
      "X-State",
      "X-Phase",
      "X-Stage",
      "X-Level",
      "X-Grade",
      "X-Rating",
      "X-Score",
      "X-Percentage",
      "X-Probability",
      "X-Boolean",
      "X-Integer",
      "X-Float",
      "X-Date",
      "X-Time",
      "X-Color",
      "X-URL",
      "X-Path",
      "X-Query",
      "X-Fragment",
    ];

    for (let i = 0; i < count; i++) {
      const headerName =
        headerNames[Math.floor(Math.random() * headerNames.length)];
      headers[headerName] = this.generateHeader(headerName);
    }

    return headers;
  }
}
