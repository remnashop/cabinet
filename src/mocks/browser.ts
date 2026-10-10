export async function enableMocks(): Promise<void> {
  const { setupWorker } = await import("msw/browser");
  const { handlers } = await import("./handlers");
  await setupWorker(...handlers).start({ onUnhandledRequest: "bypass" });
}
