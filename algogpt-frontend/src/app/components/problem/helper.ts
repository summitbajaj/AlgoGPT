// Helper functions
export const parseConstraints = (constraintsStr: string): string[] => {
    if (!constraintsStr) return [];
    return constraintsStr
      .split(/[\n,]/)
      .map((s) => s.trim().replace(/\s+/g, " "))
      .filter((s) => s.length > 0);
};
  
export const processConstraintText = (text: string) => {
    return text.replace(/(\d+)\^(\d+)/g, "$$1^{$2}$");
};