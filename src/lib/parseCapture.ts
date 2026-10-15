// V1: passthrough — extension point for future inline syntax (#tag !1)
export function parseCapture(raw: string): { content: string } {
  return { content: raw };
}
