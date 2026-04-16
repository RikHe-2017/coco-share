import process from "node:process";

const FRAMES = ["|", "/", "-", "\\"] as const;
const INTERVAL_MS = 100;

function writeLine(text: string): void {
  process.stdout.write(`${text}\n`);
}

export class Spinner {
  private timer: NodeJS.Timeout | undefined;
  private frameIndex = 0;
  private text: string;
  private lastRenderedWidth = 0;
  private readonly interactive: boolean;

  constructor(text: string) {
    this.text = text;
    this.interactive = process.stdout.isTTY;
  }

  start(): void {
    if (!this.interactive) {
      writeLine(this.text);
      return;
    }

    this.render();
    this.timer = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % FRAMES.length;
      this.render();
    }, INTERVAL_MS);
    this.timer.unref();
  }

  setText(text: string): void {
    this.text = text;
    if (this.interactive) {
      this.render();
    }
  }

  stop(message?: string): void {
    this.finish(message ?? this.text);
  }

  fail(message?: string): void {
    this.finish(message ?? this.text);
  }

  private finish(message: string): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    if (!this.interactive) {
      return;
    }

    this.clearLine();
    writeLine(message);
  }

  private render(): void {
    const frame = FRAMES[this.frameIndex] ?? FRAMES[0];
    const line = `\r${frame} ${this.text}`;
    const width = this.text.length + 2;
    const paddingWidth = Math.max(0, this.lastRenderedWidth - width);
    process.stdout.write(line + " ".repeat(paddingWidth));
    this.lastRenderedWidth = width;
  }

  private clearLine(): void {
    process.stdout.write(`\r${" ".repeat(this.lastRenderedWidth)}\r`);
    this.lastRenderedWidth = 0;
  }
}

export async function withSpinner<T>(
  text: string,
  action: (spinner: Spinner) => Promise<T>,
  successText?: string,
): Promise<T> {
  const spinner = new Spinner(text);
  spinner.start();

  try {
    const result = await action(spinner);
    spinner.stop(successText);
    return result;
  } catch (error) {
    spinner.fail();
    throw error;
  }
}
