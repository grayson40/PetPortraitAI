export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private marks: Map<string, number>;

  private constructor() {
    this.marks = new Map();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMark(name: string) {
    this.marks.set(name, Date.now());
  }

  endMark(name: string) {
    const startTime = this.marks.get(name);
    if (startTime) {
      const duration = Date.now() - startTime;
      console.log(`Performance: ${name} took ${duration}ms`);
      this.marks.delete(name);
    }
  }
} 