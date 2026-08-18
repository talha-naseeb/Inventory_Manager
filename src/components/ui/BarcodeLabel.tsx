import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "react-qr-code";

interface BarcodeLabelProps {
  value: string;
  type?: "barcode" | "qr";
  label?: string;
  subLabel?: string;
  width?: number;
  height?: number;
  fontSize?: number;
  showText?: boolean;
}

export const BarcodeLabel: React.FC<BarcodeLabelProps> = ({
  value,
  type = "barcode",
  label,
  subLabel,
  width = 2,
  height = 40,
  fontSize = 12,
  showText = true,
}) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (type === "barcode" && barcodeRef.current && value) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format: "CODE128",
          width,
          height,
          displayValue: showText,
          fontSize,
          margin: 5,
        });
      } catch (err) {
        console.error("Barcode generation failed:", err);
      }
    }
  }, [value, type, width, height, fontSize, showText]);

  return (
    <div className="flex flex-col items-center p-2 bg-white border border-slate-100 rounded shadow-sm print:shadow-none print:border-none">
      {label && <div className="text-[10px] font-bold text-slate-800 uppercase mb-1">{label}</div>}
      
      {type === "barcode" ? (
        <svg ref={barcodeRef} className="max-w-full" />
      ) : (
        <div className="p-1 bg-white">
          <QRCode value={value} size={height + 20} />
        </div>
      )}
      
      {subLabel && <div className="text-[9px] text-slate-500 mt-1">{subLabel}</div>}
      {type === "qr" && showText && <div className="text-[10px] font-mono mt-1">{value}</div>}
    </div>
  );
};
