"use client";
import React from "react";
import Button from "../ui/button/Button";
import AddCoach from "../coach/AddCoach";
import ProductCreateModal from "@/components/products/ProductCreateModal";
import ManagerCreateModal from "@/components/managers/ManagerCreateModal";

interface BreadcrumbProps {
  pageTitle: string;
  buttonTitle?: string;
  modalType?: string;
  loadCoaches?: () => Promise<void>;
  loadManagers?: () => Promise<void>;
}

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({ pageTitle, buttonTitle, modalType = "", loadCoaches, loadManagers }) => {
  const [modalName, setModalName] = React.useState<string>("");

  const toggleModal = () => {
    setModalName("")
  }

  const handleOpenModal = () => {
    setModalName(modalType);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h2
        className="text-xl font-semibold text-gray-800 dark:text-white/90"
        x-text="pageName"
      >
        {pageTitle}
      </h2>
      {buttonTitle && <Button variant="primary" onClick={handleOpenModal}>{buttonTitle || "Add New"}</Button>}
      <AddCoach isOpen={modalName === "add-coach"} onClose={toggleModal} loadCoaches={loadCoaches} />
      <ProductCreateModal isOpen={modalName === "add-product"} onClose={toggleModal} />
      <ManagerCreateModal isOpen={modalName === "add-manager"} onClose={toggleModal} loadManagers={loadManagers} />
    </div>
  );
};

export default PageBreadcrumb;
