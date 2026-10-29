import { Link } from 'react-router-dom';
import {
  Globe,
  MessageCircle,
  Video,
  Music,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import BrandLogo from '@/components/common/BrandLogo';
import { APP_NAME, APP_DESCRIPTION, CONTACT } from '@/utils/constants';
import { ROUTES } from '@/routes/routePaths';

const footerLinks = {
  about: [
    { label: 'Giới thiệu', href: '#' },
    { label: 'Tin tức', href: '#' },
    { label: 'Tuyển dụng', href: '#' },
    { label: 'Liên hệ', href: '#' },
  ],
  policy: [
    { label: 'Chính sách bảo hành', href: '#' },
    { label: 'Chính sách đổi trả', href: '#' },
    { label: 'Chính sách bảo mật', to: ROUTES.CHINH_SACH_BAO_MAT },
    { label: 'Điều khoản sử dụng', to: ROUTES.DIEU_KHOAN },
  ],
  support: [
    { label: 'Hướng dẫn mua hàng', href: '#' },
    { label: 'Hướng dẫn bán góp', href: '#' },
    { label: 'Câu hỏi thường gặp', href: '#' },
    { label: 'Liên hệ hỗ trợ', href: '#' },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white pt-12 pb-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <BrandLogo size="md" />
            <p className="mt-4 text-sm text-gray-600">{APP_DESCRIPTION}</p>
            <div className="mt-4 flex gap-2">
              {[
                { Icon: Globe, color: 'hover:bg-blue-600' },
                { Icon: MessageCircle, color: 'hover:bg-pink-600' },
                { Icon: Video, color: 'hover:bg-red-600' },
                { Icon: Music, color: 'hover:bg-black' },
              ].map(({ Icon, color }, idx) => (
                <a
                  key={idx}
                  href="#"
                  className={`flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-all hover:text-white ${color}`}
                  aria-label="social"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* About */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-gray-900">
              Về chúng tôi
            </h4>
            <ul className="space-y-2">
              {footerLinks.about.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-green-600"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Policy */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-gray-900">
              Chính sách
            </h4>
            <ul className="space-y-2">
              {footerLinks.policy.map((link) => (
                <li key={link.label}>
                  {'to' in link && link.to ? (
                    <Link
                      to={link.to}
                      className="text-sm text-gray-600 hover:text-green-600"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={'href' in link ? link.href : '#'}
                      className="text-sm text-gray-600 hover:text-green-600"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-gray-900">
              Hỗ trợ khách hàng
            </h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-green-600"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-gray-900">
              Liên hệ với chúng tôi
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>{CONTACT.hotline}</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span className="break-all">{CONTACT.email}</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span>{CONTACT.address}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 border-t border-gray-100 pt-6">
          <p className="text-center text-xs text-gray-500">
            © 2026 {APP_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
