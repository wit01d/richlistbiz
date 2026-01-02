import { Users } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SVGReferralTree } from '../tree/SVGReferralTree';
import { SectionHeader } from '../primitives';
import type { ReferralTreeNode } from '../../types';

export interface ReferralTreeSectionProps {
  tree: ReferralTreeNode[];
  username: string;
}

export const ReferralTreeSection: React.FC<ReferralTreeSectionProps> = ({
  tree,
  username,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-black/40 backdrop-blur-md border border-neon-purple/30 rounded-2xl p-6 mb-6">
      <SectionHeader
        icon={Users}
        title={t('referrals.networkTitle')}
        subtitle={t('referrals.networkSubtitle')}
        colorTheme="purple"
        large
      />

      <SVGReferralTree tree={tree} username={username} />
    </div>
  );
};
