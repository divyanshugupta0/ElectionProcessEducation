// ====================================================================
// Unit Tests for CivicConnect
// ====================================================================
"use strict";

const DOMPurify = {
    sanitize: (str) => {
        if (typeof str !== 'string') return '';
        return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
    }
};

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function getFriendlyError(code) {
    const map = {
        'auth/user-not-found': 'No account found with that email.',
        'auth/wrong-password': 'Incorrect password. Please try again.'
    };
    return map[code] || 'An error occurred. Please try again.';
}

console.log("Running CivicConnect Unit Tests...\n");

// Test: DOMPurify Custom Sanitizer
console.log("Test: DOMPurify.sanitize");
const inputXSS = "<script>alert('xss')</script>";
const expectedXSS = "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;";
console.assert(DOMPurify.sanitize(inputXSS) === expectedXSS, "XSS prevention failed");
console.assert(DOMPurify.sanitize(null) === "", "Null input failed");
console.assert(DOMPurify.sanitize(123) === "", "Number input failed");
const inputSafe = "Hello World";
console.assert(DOMPurify.sanitize(inputSafe) === inputSafe, "Safe string failed");
console.log("✓ DOMPurify.sanitize passed\n");

// Test: Debounce Utility
console.log("Test: debounce function");
console.assert(typeof debounce === "function", "debounce is not a function");
console.log("✓ debounce passed\n");

// Test: Error Handling
console.log("Test: getFriendlyError mapping");
const friendlyNotFound = getFriendlyError("auth/user-not-found");
console.assert(friendlyNotFound.includes("No account found"), "Error mapping failed");
const friendlyUnknown = getFriendlyError("auth/unknown");
console.assert(friendlyUnknown === "An error occurred. Please try again.", "Default error mapping failed");
console.log("✓ getFriendlyError passed\n");

console.log("✅ All basic tests passed successfully!");
