import React from 'react';
export default function DealerReviewAttribution({ profile }) {
  const verifier = profile.kycVerifiedBy || (profile.kycReviewAction === 'approved' ? profile.kycReviewedBy : null);
  const verifiedAt = profile.kycVerifiedAt || (profile.kycReviewAction === 'approved' ? profile.kycReviewedAt : null);
  return <div className="text-xs leading-5">
    <p className="font-semibold">{profile.status === 'approved' ? 'Verified by' : 'Last verified by'}: {verifier?.fullName || verifier?.email || 'Not recorded'}</p>
    {verifier && <p className="text-muted-foreground">{verifier.isEmployee ? 'Employee' : 'Super admin'}</p>}
    {verifiedAt && <p className="text-muted-foreground">{new Date(verifiedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST</p>}
    {profile.kycReviewAction && profile.kycReviewAction !== 'approved' && profile.kycReviewedBy && <p className="mt-1 text-muted-foreground">{profile.kycReviewAction === 'revoked' ? 'Revoked' : 'Rejected'} by {profile.kycReviewedBy.fullName || profile.kycReviewedBy.email}</p>}
  </div>;
}
