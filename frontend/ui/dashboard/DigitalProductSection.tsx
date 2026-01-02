import { Download, FileText } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SectionHeader } from '../primitives';

export const DigitalProductSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-gradient-to-br from-emerald-500/10 to-neon-blue/10 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-6 mb-8">
      <SectionHeader
        icon={FileText}
        title={t('digitalProduct.title', 'Digital Product')}
        subtitle={t('digitalProduct.subtitle', 'Exclusive member content')}
        colorTheme="emerald"
        large
      />

      <div className="bg-black/30 border border-white/10 rounded-xl p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-neon-blue rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Download className="text-white" size={28} />
            </div>
            <div>
              <h4 className="text-white font-medium text-lg">{t('digitalProduct.productName', 'RichList Success Guide')}</h4>
              <p className="text-gray-400 text-sm mt-1">{t('digitalProduct.productDescription', 'Your complete guide to maximizing your referral network and earnings potential.')}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">PDF</span>
                <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">2.4 MB</span>
              </div>
            </div>
          </div>
          <a
            href="/downloads/richlist-success-guide.pdf"
            download
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium text-sm hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Download size={18} />
            {t('digitalProduct.downloadButton', 'Download Now')}
          </a>
        </div>
      </div>
    </div>
  );
};
