import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { UserTypeModal } from "./UserTypeModal";
import { LanguageSelector } from "./LanguageSelector";

export const Header = () => {
  const { t } = useTranslation();
  const [showUserTypeModal, setShowUserTypeModal] = useState(false);
  
  const menuItems = [
    { name: t("Home"), href: "#home" },
    { name: t("Offer"), href: "#offer" },
    { name: t("about"), href: "#about" },
    { name: t("pricing"), href: "#pricing" },
    { name: t("contact"), href: "#contact" }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Logo withLink priority size="md" />

          {/* Navigation Menu */}
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

          {/* Action Buttons and Language Selector */}
          <div className="flex items-center space-x-4">
            <LanguageSelector />
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
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden">
            <div className="w-6 h-6 flex flex-col justify-center items-center space-y-1">
              <div className="w-4 h-0.5 bg-foreground"></div>
              <div className="w-4 h-0.5 bg-foreground"></div>
              <div className="w-4 h-0.5 bg-foreground"></div>
            </div>
          </button>
        </div>
      </div>
      
      <UserTypeModal
        isOpen={showUserTypeModal}
        onClose={() => setShowUserTypeModal(false)}
      />
    </header>
  );
};