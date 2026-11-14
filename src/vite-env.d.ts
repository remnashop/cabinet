/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MOCKS?: string;
}

interface Window {
  /** location.hash as public/telegram-launch.js saw it */
  __tgLaunchHash?: string;
}
