'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, Info, Zap, TrendingUp, BarChart2, ShieldCheck, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MARKET_TERMS_GLOSSARY } from '@/utils/productVolumeConverter';

interface MarketTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarketTermsModal: React.FC<MarketTermsModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl flex flex-col justify-between"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <BookOpen className="size-4 text-cyan-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    Lexique &amp; Compréhension des Termes de Marché
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Définition des indicateurs clés utilisés dans la Bourse E-Maquis
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-foreground"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Scrollable Glossary Content */}
            <div className="my-4 overflow-y-auto pr-1 space-y-3.5 max-h-[60vh]">
              {MARKET_TERMS_GLOSSARY.map((term, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-900/80 transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Info className="size-3.5 text-cyan-400" />
                      {term.term}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-slate-700 text-slate-400">
                      {term.badge}
                    </Badge>
                  </div>

                  <div className="text-[11px] font-mono text-emerald-400/90 font-semibold">
                    Calcul : {term.formula}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {term.definition}
                  </p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="size-3.5" />
                Certifié Réseau Réel E-Maquis (Sans extrapolation)
              </span>
              <Button size="sm" onClick={onClose} className="h-8 px-4 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-foreground">
                Fermer
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
