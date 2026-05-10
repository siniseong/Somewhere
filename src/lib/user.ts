const NAME_KEY = "somr-user-name";
const DEVICE_KEY = "somr-device-id";
const DEFAULT_NAME = "나";

export function getUserName(): string {
  if (typeof window === "undefined") return DEFAULT_NAME;
  return window.localStorage.getItem(NAME_KEY) ?? DEFAULT_NAME;
}

export function setUserName(name: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NAME_KEY, name.trim());
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}
