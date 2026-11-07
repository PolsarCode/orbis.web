"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider, theme } from "antd";
import { useEffect, type ReactNode } from "react";
import { palette } from "@/lib/palette";
import { useMediaQuery } from "@/lib/use-media-query";
import { useThemeStore } from "@/stores/theme-store";

export function AntdProvider({ children }: { children: ReactNode }) {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)", false);
  const touch = !useMediaQuery("(hover: hover)", true);
  const mode = useThemeStore((state) => state.mode);
  const isDark = mode === "dark" || (mode === "system" && prefersDark);
  const colors = isDark ? palette.dark : palette.light;
  const algorithm = isDark ? theme.darkAlgorithm : theme.defaultAlgorithm;
  const resting = touch
    ? theme.getDesignToken({
        algorithm,
        token: { colorPrimary: colors.accent, colorLink: colors.accent, colorError: colors.danger },
      })
    : null;

  useEffect(() => {
    useThemeStore.persist.rehydrate();
  }, []);

  return (
    <AntdRegistry layer>
      <ConfigProvider
        theme={{
          algorithm,
          token: {
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 14,
            borderRadius: 8,
            borderRadiusLG: 12,
            controlHeight: 36,
            controlHeightLG: 44,
            controlHeightSM: 32,
            colorPrimary: colors.accent,
            colorPrimaryHover: resting ? resting.colorPrimary : colors.accentHover,
            colorPrimaryActive: colors.accentActive,
            colorLink: colors.accent,
            colorLinkHover: resting ? resting.colorLink : colors.accentHover,
            colorLinkActive: colors.accentActive,
            colorError: colors.danger,
            colorErrorHover: resting ? resting.colorError : colors.dangerHover,
            colorErrorActive: colors.dangerActive,
            colorTextDisabled: colors.muted,
            colorBgContainerDisabled: colors.railItem,
            colorSuccess: colors.online,
            colorText: colors.foreground,
            colorTextSecondary: colors.muted,
            colorTextTertiary: colors.muted,
            colorTextPlaceholder: colors.muted,
            colorTextLightSolid: colors.accentForeground,
            colorBorder: colors.divider,
            colorBorderSecondary: colors.divider,
            colorSplit: colors.divider,
            colorBgContainer: colors.surface,
            colorBgElevated: colors.surface,
            colorBgLayout: colors.background,
            colorFillSecondary: colors.railItem,
            ...(touch && { colorBgTextHover: "transparent", controlItemBgHover: "transparent" }),
          },
          components: {
            Segmented: {
              trackBg: colors.rail,
              itemSelectedBg: colors.surface,
              itemColor: colors.foreground,
              itemHoverColor: colors.foreground,
              itemSelectedColor: colors.foreground,
              trackPadding: 4,
              ...(touch && { itemHoverBg: "transparent" }),
            },
            Switch: {
              colorTextQuaternary: colors.railItem,
              colorTextTertiary: colors.divider,
            },
            Input: {
              activeBorderColor: colors.accent,
              hoverBorderColor: touch ? colors.divider : colors.muted,
              activeShadow: `0 0 0 1px ${colors.accent}`,
              inputFontSizeLG: 14,
            },
            Form: {
              labelFontSize: 13,
              verticalLabelPadding: "0 0 8px",
              itemMarginBottom: 0,
            },
            Button: touch
              ? {
                  defaultHoverBg: colors.surface,
                  defaultHoverColor: colors.foreground,
                  defaultHoverBorderColor: colors.divider,
                  textHoverBg: "transparent",
                }
              : {},
            Tooltip: {
              colorBgSpotlight: colors.foreground,
              colorTextLightSolid: colors.background,
            },
          },
        }}
      >
        <App component={false}>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
