// Define measurement type colors using Tailwind CSS color palette
export const measurementColors: Record<string, string> = {
  'pH': 'rgb(59, 130, 246)',      // Blue-500
  'Cloro': 'rgb(16, 185, 129)',   // Green-500
  'Turbidez': 'rgb(239, 68, 68)', // Red-500
  'Vazão': 'rgb(245, 158, 11)',   // Amber-500
  'ORP': 'rgb(139, 92, 246)',     // Purple-500
  'Hidrômetro': 'rgb(236, 72, 153)', // Pink-500
  'Condutividade': 'rgb(14, 165, 233)', // Sky-500
  'Oxigênio': 'rgb(34, 197, 94)', // Green-500
  'Pressão': 'rgb(249, 115, 22)', // Orange-500
  'TDS': 'rgb(168, 85, 247)',     // Purple-500
  'Registro (m3)': 'rgb(245, 158, 11)', // Amber-500
  'Volume': 'rgb(245, 158, 11)'   // Amber-500
};

// Fallback colors for unknown measurement types
export const fallbackColors = [
  'rgb(59, 130, 246)',   // Blue-500
  'rgb(16, 185, 129)',   // Green-500
  'rgb(239, 68, 68)',    // Red-500
  'rgb(245, 158, 11)',   // Amber-500
  'rgb(139, 92, 246)',   // Purple-500
  'rgb(236, 72, 153)',   // Pink-500
  'rgb(14, 165, 233)',   // Sky-500
  'rgb(34, 197, 94)',    // Green-500
  'rgb(249, 115, 22)',   // Orange-500
  'rgb(168, 85, 247)'    // Purple-500
];

export function getMeasurementColor(type: string): string {
  return measurementColors[type] || fallbackColors[Math.floor(Math.random() * fallbackColors.length)];
}