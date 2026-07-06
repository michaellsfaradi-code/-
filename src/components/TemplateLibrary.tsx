import React, { useState } from 'react';
import { BOT_TEMPLATES, BotTemplate } from '../templates';
import { Bot, ChevronRight, Check } from 'lucide-react';

interface TemplateLibraryProps {
  onImport: (template: BotTemplate) => void;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({ onImport }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-right">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Bot className="text-rose-500" />
        ספריית תבניות אוטומציה
      </h3>
      <div className="space-y-4">
        {BOT_TEMPLATES.map((template) => (
          <div
            key={template.name}
            className={`p-4 rounded-xl border transition-all ${
              selectedTemplate === template.name
                ? "border-rose-500 bg-slate-800"
                : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-white">{template.name}</h4>
              <button
                onClick={() => {
                  setSelectedTemplate(template.name);
                  onImport(template);
                }}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs flex items-center gap-1"
              >
                {selectedTemplate === template.name ? <Check size={14} /> : "ייבוא"}
              </button>
            </div>
            <p className="text-slate-400 text-sm">{template.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
