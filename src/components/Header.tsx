import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { UserTypeModal } from "./UserTypeModal";
import { LanguageSelector } from "./LanguageSelector";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { X, Menu } from "lucide-react";

export const Header = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showUserTypeModal, setShowUserTypeModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const menuItems = [
    { name: t("Home"), href: "#home" },
    { name: t("Offer"), href: "#offer" },
    { name: t("about"), href: "#about" },
    { name: t("pricing"), href: "#pricing" },
    { name: t("contact"), href: "#contact" }
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Logo withLink priority size="md" />

          {/* Navigation Menu - Desktop */}
          <nav className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium"
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* Action Buttons and Language Selector - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <LanguageSelector />
            <ThemeToggle />
            {user ? (
              <NotificationBell />
            ) : (
              <>
                <Button variant="outline" size="sm" asChild>
                  <a href="/login">{t('login')}</a>
                </Button>
                <Button 
                  variant="medical" 
                  size="sm" 
                  onClick={() => setShowUserTypeModal(true)}
                >
                  {t('register')}
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-foreground hover:text-primary transition-colors"
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-background border-b border-border shadow-lg z-40 animate-fade-in">
            <nav className="px-4 py-6 space-y-4 animate-slide-down">
              {menuItems.map((item, index) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="block text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium py-2 opacity-0 animate-fade-in hover-scale"
                  style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
                  onClick={closeMobileMenu}
                >
                  {item.name}
                </a>
              ))}
              
              {/* Mobile Action Buttons */}
              <div className="pt-4 space-y-3 border-t border-border opacity-0 animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
                <LanguageSelector />
                <div className="flex justify-center">
                  <ThemeToggle showText={true} variant="outline" size="sm" />
                </div>
                {user ? (
                  <div className="flex justify-center">
                    <NotificationBell size="lg" />
                  </div>
                ) : (
                  <>
                    <Button variant="outline" size="sm" className="w-full hover-scale" asChild>
                      <a href="/login" onClick={closeMobileMenu}>{t('login')}</a>
                    </Button>
                    <Button 
                      variant="medical" 
                      size="sm" 
                      className="w-full hover-scale"
                      onClick={() => {
                        setShowUserTypeModal(true);
                        closeMobileMenu();
                      }}
                    >
                      {t('register')}
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
      
      <UserTypeModal
        isOpen={showUserTypeModal}
        onClose={() => setShowUserTypeModal(false)}
      />
    </header>
  );
};