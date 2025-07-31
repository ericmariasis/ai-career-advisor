"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDebouncedApi = useDebouncedApi;
const react_1 = require("react");
const axios_1 = __importDefault(require("axios"));
function useDebouncedApi(url, delay = 600) {
    const timeoutRef = (0, react_1.useRef)(null);
    const debouncedCall = (0, react_1.useCallback)((data) => {
        return new Promise((resolve, reject) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(async () => {
                try {
                    const response = await axios_1.default.post(url, data);
                    resolve(response);
                }
                catch (error) {
                    reject(error);
                }
            }, delay);
        });
    }, [url, delay]);
    return debouncedCall;
}
