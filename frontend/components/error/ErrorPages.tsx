'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ErrorPageProps {
  code?: string;
  title?: string;
  message?: string;
}

export function UnauthorizedPage({ title, message }: ErrorPageProps) {
  const params = useParams();
  const locale = (params.locale as string) ?? 'ar';
  const isArabic = locale === 'ar';
  return (
    <div className="min-h-screen bg-gray-light flex items-center justify-center p-6">
      <div className="bg-surface rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-primary mb-2">{title ?? (isArabic ? 'غير مصرح' : 'Unauthorized')}</h2>
        <p className="text-gray-500 mb-6">{message ?? (isArabic ? 'يرجى تسجيل الدخول للمتابعة' : 'Please log in to continue.')}</p>
        <Link href={`/${locale}/login`} className="inline-block px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
          {isArabic ? 'تسجيل الدخول' : 'Log In'}
        </Link>
      </div>
    </div>
  );
}

export function ForbiddenPage({ message }: ErrorPageProps) {
  const params = useParams();
  const locale = (params.locale as string) ?? 'ar';
  const isArabic = locale === 'ar';
  return (
    <div className="min-h-screen bg-gray-light flex items-center justify-center p-6">
      <div className="bg-surface rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-primary mb-2">{isArabic ? 'لا تملك الصلاحية' : 'Forbidden'}</h2>
        <p className="text-gray-500 mb-6">{message ?? (isArabic ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة' : 'You do not have permission to access this page.')}</p>
        <Link href={`/${locale}/admin`} className="inline-block px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
          {isArabic ? 'العودة للرئيسية' : 'Go Home'}
        </Link>
      </div>
    </div>
  );
}

export function NotFoundErrorPage({ message }: ErrorPageProps) {
  const params = useParams();
  const locale = (params.locale as string) ?? 'ar';
  const isArabic = locale === 'ar';
  return (
    <div className="min-h-screen bg-gray-light flex items-center justify-center p-6">
      <div className="bg-surface rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
        <h2 className="text-xl font-bold text-primary mb-2">{isArabic ? 'الصفحة غير موجودة' : 'Page Not Found'}</h2>
        <p className="text-gray-500 mb-6">{message ?? (isArabic ? 'الصفحة التي تبحث عنها غير موجودة' : 'The page you are looking for does not exist.')}</p>
        <Link href={`/${locale}/admin`} className="inline-block px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
          {isArabic ? 'العودة للرئيسية' : 'Go Home'}
        </Link>
      </div>
    </div>
  );
}

export function ServerErrorPage({ message }: ErrorPageProps) {
  const params = useParams();
  const locale = (params.locale as string) ?? 'ar';
  const isArabic = locale === 'ar';
  return (
    <div className="min-h-screen bg-gray-light flex items-center justify-center p-6">
      <div className="bg-surface rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <h1 className="text-6xl font-bold text-gray-200 mb-4">500</h1>
        <h2 className="text-xl font-bold text-primary mb-2">{isArabic ? 'خطأ في الخادم' : 'Server Error'}</h2>
        <p className="text-gray-500 mb-6">{message ?? (isArabic ? 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً' : 'A server error occurred. Please try again later.')}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
          {isArabic ? 'إعادة المحاولة' : 'Retry'}
        </button>
      </div>
    </div>
  );
}
