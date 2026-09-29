import fs from 'fs';
import path from 'path';

const filePath = path.resolve('frontend/src/layouts/PublicLayout.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const target = `{/* Top Announcement Bar (Only shown when authenticated: Welcome back, {FULL_NAME}, you are now logged in. Logout) */}
        {isAuthenticated && (
          <div className="w-full bg-white border-b border-gray-200 py-1 sm:py-1.5 px-4 text-center text-xs text-gray-600 font-medium tracking-wide">
            <span>
              Welcome back,{' '}
              <strong className="text-[#800020] font-bold uppercase tracking-tight">
                {user?.fullName || user?.name || user?.contactPerson || 'Customer'}
              </strong>
              {user?.role === 'dealer' && ' (Verified Dealer)'}
              {', you are now logged in. '}
              <button
                type="button"
                onClick={handleLogout}
                className="font-bold text-[#800020] hover:underline cursor-pointer transition-colors inline-block ml-0.5"
              >
                Logout
              </button>
            </span>
          </div>
        )}`;

const replacement = `{/* Top Announcement Bar (Mega Jaipur Style: Welcome back, {FULL_NAME}, you are now logged in. Logout / You are not logged in.) */}
        <div className="w-full bg-white border-b border-gray-200 py-1 sm:py-1.5 px-4 text-center text-xs text-gray-600 font-medium tracking-wide">
          {isAuthenticated ? (
            <span>
              Welcome back,{' '}
              <strong className="text-[#800020] font-bold uppercase tracking-tight">
                {user?.fullName || user?.name || user?.contactPerson || 'Customer'}
              </strong>
              {user?.role === 'dealer' && ' (Verified Dealer)'}
              {', you are now logged in. '}
              <button
                type="button"
                onClick={handleLogout}
                className="font-bold text-[#800020] hover:underline cursor-pointer transition-colors inline-block ml-0.5"
              >
                Logout
              </button>
            </span>
          ) : (
            <span>You are not logged in.</span>
          )}
        </div>`;

const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');
const normalizedReplacement = replacement.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
  const updated = normalizedContent.replace(normalizedTarget, normalizedReplacement);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('Successfully restored top announcement bar in PublicLayout.jsx');
} else {
  console.error('Target not found in PublicLayout.jsx');
}
