// Full design-token catalog from Design_guide.html §1 + §4.
// Consumed by ThemeContext; never import tokens directly in components —
// always use useTheme().tokens so theme switching works reactively.

export type BrandTokens = {
  // ── Canvas ──
  canvasBg: string;
  canvasSubtle: string;
  // ── Surface ──
  surfaceCard: string;
  surfaceElevated: string;
  surfaceHover: string;
  surfaceActive: string;
  surfaceSunken: string;
  // ── Typography ──
  textBright: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  textBrand: string;
  // ── Borders ──
  borderHairline: string;
  borderSubtle: string;
  borderStrong: string;
  borderFocus: string;
  // ── Brand primary ──
  brandPrimary: string;
  brandPrimaryHover: string;
  brandPrimaryActive: string;
  brandPrimarySubtle: string;
  brandPrimaryBorder: string;
  // ── Semantic ──
  telemetryCyan: string;
  telemetryCyanSubtle: string;
  signalEmerald: string;
  signalEmeraldSubtle: string;
  warningAmber: string;
  warningAmberSubtle: string;
  dangerCrimson: string;
  dangerCrimsonSubtle: string;
  // ── Seats ──
  seatAvailableBg: string;
  seatAvailableBorder: string;
  seatAvailableText: string;
  seatSelectedBg: string;
  seatSelectedBorder: string;
  seatSelectedText: string;
  seatLockedBg: string;
  seatLockedBorder: string;
  seatLockedText: string;
  seatBookedBg: string;
  seatBookedBorder: string;
  seatBookedText: string;
  seatFemaleBg: string;
  seatFemaleBorder: string;
  seatFemaleText: string;
  // ── Logo mapping (Design_guide §2) ──
  logoPrimary: string;
  logoVehicle: string;
  logoPin: string;
  logoTypoBus: string;
  logoTypoVerse: string;
  logoCanvasFill: string;
  // ── Shadows (RN-compatible, Design_guide §4) ──
  shadowAmbient: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  shadowFloating: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  shadowModal: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  shadowGlowPrimary: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
};

export const lightTokens: BrandTokens = {
  canvasBg: '#F4F7FB',
  canvasSubtle: '#EAEFF6',
  surfaceCard: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceHover: '#F1F5F9',
  surfaceActive: '#E2E8F0',
  surfaceSunken: '#E5ECF4',
  textBright: '#09101D',
  textPrimary: '#1E293B',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textInverse: '#F8FAFC',
  textBrand: '#0052E0',
  borderHairline: 'rgba(15, 23, 42, 0.07)',
  borderSubtle: 'rgba(15, 23, 42, 0.12)',
  borderStrong: 'rgba(15, 23, 42, 0.22)',
  borderFocus: '#0052E0',
  brandPrimary: '#0055ED',
  brandPrimaryHover: '#0044C0',
  brandPrimaryActive: '#00379C',
  brandPrimarySubtle: 'rgba(0, 85, 237, 0.08)',
  brandPrimaryBorder: 'rgba(0, 85, 237, 0.25)',
  telemetryCyan: '#008DA6',
  telemetryCyanSubtle: 'rgba(0, 141, 166, 0.1)',
  signalEmerald: '#059669',
  signalEmeraldSubtle: 'rgba(5, 150, 105, 0.1)',
  warningAmber: '#D97706',
  warningAmberSubtle: 'rgba(217, 119, 6, 0.1)',
  dangerCrimson: '#DC2626',
  dangerCrimsonSubtle: 'rgba(220, 38, 38, 0.1)',
  seatAvailableBg: 'rgba(5, 150, 105, 0.12)',
  seatAvailableBorder: '#059669',
  seatAvailableText: '#047857',
  seatSelectedBg: '#0055ED',
  seatSelectedBorder: '#0044C0',
  seatSelectedText: '#FFFFFF',
  seatLockedBg: 'rgba(217, 119, 6, 0.14)',
  seatLockedBorder: '#D97706',
  seatLockedText: '#B45309',
  seatBookedBg: '#E2E8F0',
  seatBookedBorder: '#CBD5E1',
  seatBookedText: '#94A3B8',
  seatFemaleBg: 'rgba(219, 39, 119, 0.12)',
  seatFemaleBorder: '#DB2777',
  seatFemaleText: '#BE185D',
  logoPrimary: '#0055ED',
  logoVehicle: '#0B1830',
  logoPin: '#0055ED',
  logoTypoBus: '#0B1830',
  logoTypoVerse: '#0055ED',
  logoCanvasFill: '#FFFFFF',
  shadowAmbient: {
    shadowColor: '#09101D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  shadowFloating: {
    shadowColor: '#09101D',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 36,
    elevation: 6,
  },
  shadowModal: {
    shadowColor: '#09101D',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.18,
    shadowRadius: 64,
    elevation: 12,
  },
  shadowGlowPrimary: {
    shadowColor: '#0055ED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 4,
  },
};

export const darkTokens: BrandTokens = {
  canvasBg: '#060A12',
  canvasSubtle: '#0B111D',
  surfaceCard: '#0D1525',
  surfaceElevated: '#131E34',
  surfaceHover: '#192742',
  surfaceActive: '#213355',
  surfaceSunken: '#080D17',
  textBright: '#FFFFFF',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#060A12',
  textBrand: '#3B82F6',
  borderHairline: 'rgba(255, 255, 255, 0.07)',
  borderSubtle: 'rgba(255, 255, 255, 0.12)',
  borderStrong: 'rgba(255, 255, 255, 0.24)',
  borderFocus: '#3B82F6',
  brandPrimary: '#2B75FF',
  brandPrimaryHover: '#4586FF',
  brandPrimaryActive: '#1A64ED',
  brandPrimarySubtle: 'rgba(43, 117, 255, 0.14)',
  brandPrimaryBorder: 'rgba(43, 117, 255, 0.35)',
  telemetryCyan: '#00E5FF',
  telemetryCyanSubtle: 'rgba(0, 229, 255, 0.14)',
  signalEmerald: '#10B981',
  signalEmeraldSubtle: 'rgba(16, 185, 129, 0.14)',
  warningAmber: '#F59E0B',
  warningAmberSubtle: 'rgba(245, 158, 11, 0.14)',
  dangerCrimson: '#EF4444',
  dangerCrimsonSubtle: 'rgba(239, 68, 68, 0.14)',
  seatAvailableBg: 'rgba(16, 185, 129, 0.14)',
  seatAvailableBorder: 'rgba(16, 185, 129, 0.45)',
  seatAvailableText: '#34D399',
  seatSelectedBg: '#2B75FF',
  seatSelectedBorder: '#60A5FA',
  seatSelectedText: '#FFFFFF',
  seatLockedBg: 'rgba(245, 158, 11, 0.14)',
  seatLockedBorder: 'rgba(245, 158, 11, 0.5)',
  seatLockedText: '#FBBF24',
  seatBookedBg: '#141E30',
  seatBookedBorder: 'rgba(255, 255, 255, 0.05)',
  seatBookedText: '#475569',
  seatFemaleBg: 'rgba(236, 72, 153, 0.14)',
  seatFemaleBorder: 'rgba(236, 72, 153, 0.5)',
  seatFemaleText: '#F472B6',
  logoPrimary: '#2B75FF',
  logoVehicle: '#FFFFFF',
  logoPin: '#00E5FF',
  logoTypoBus: '#FFFFFF',
  logoTypoVerse: '#2B75FF',
  logoCanvasFill: '#0B1220',
  shadowAmbient: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 4,
  },
  shadowFloating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.75,
    shadowRadius: 48,
    elevation: 8,
  },
  shadowModal: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 28 },
    shadowOpacity: 0.9,
    shadowRadius: 72,
    elevation: 14,
  },
  shadowGlowPrimary: {
    shadowColor: '#2B75FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 5,
  },
};

export const brandTokens = { light: lightTokens, dark: darkTokens } as const;
export type ThemeMode = keyof typeof brandTokens;
