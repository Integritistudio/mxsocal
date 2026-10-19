import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

import Image from "next/image";
import { UserTableOrder, UserData } from "@/utils/types";
import { MdDelete } from "react-icons/md";
import { FaRegEdit } from "react-icons/fa";
import ConfirmModal from "../common/ConfirmModal";
import { useAlert } from "@/context/AlertContext";
import { deleteManager } from "@/services/managers";
import ManagerCreateModal from "./ManagerCreateModal";



const getTableData = (data: UserData[]) => {
  return data?.map((row) => ({
    id: row.id,
    user: {
      image: row.profileImage ?? "/user_icon.png",
      name: row?.name,
      email: row.email ?? "",
    },
    phone: row?.phone ?? "-",
    city: row.city ?? "-",
    state: row?.state ?? "-",
    country: row?.country ?? "-",
  })) ?? [];
};





export default function ManagerTable({ managers, loadManagers }: { managers: UserData[], loadManagers: () => any }) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const formattedManagers = getTableData(managers)
  const [selectedCoach, setSelectedCoach] = useState<UserData | null>(null);
  const [deletionId, setDeletionId] = useState<any>(null);
  const [open, setOpen] = useState<boolean>(false);
  const [openConfirm, setOpenConfirm] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false)

  const openEdit = (id: any) => {
    const manager = managers.find((c) => c.id === id);
    if (manager) {
      setSelectedCoach(manager);
      setOpen(true);
    }
  }

  const onCloseEdit = () => {
    setSelectedCoach(null);
    setOpen(false);
  }

  const openDelete = (id: any) => {
    setDeletionId(id);
    setOpenConfirm(true);
  }
  const closeDelete = () => {
    setDeletionId(null);
    setOpenConfirm(false);
  }

  const handleConfirmDelete = async () => {
    if (!deletionId) return;
    try {
      setLoading(true);
      await deleteManager(deletionId);
      loadManagers?.()
      showAlert("success", "Manager deleted successfully");
      setDeletionId(null);
      setOpenConfirm(false)
    } catch (err) {
      showAlert("error", "Failed to delete coach");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-full overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-full">
          <Table>
            {/* Table Header */}
            <TableHeader className="border-b border-gray-100 dark:border-white/5">
              <TableRow>
                {["User", "Phone", "City", "State", "Country", ""].map((label, index) => (
                  <TableCell
                    isHeader
                    key={index}
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
              {formattedManagers.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="px-5 py-4 sm:px-6 text-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 overflow-hidden rounded-full">
                        <Image
                          width={40}
                          height={40}
                          src={order?.user?.image ?? "/user_icon.png"}
                          alt={order?.user?.name || "Image"}
                          className="w-full h-full bg-cover"
                        />
                      </div>
                      <div>
                        <span
                          className="block font-medium hover:text-blue-400 transition-all duration-300 cursor-pointer text-gray-800 text-theme-sm dark:text-white/90 dark:hover:text-blue-600"
                          onClick={() => order.id && router.push(`/managers/${order.id}`)}
                        >
                          {order.user.name}
                        </span>

                        <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                          {order.user.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {order.phone}
                  </TableCell>
                  {["city", "state", "country"].map((value: string, index) => (
                    <TableCell key={index} className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {String(order[value as keyof typeof order])}
                    </TableCell>
                  ))}
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    <div className="flex justify-center items-center gap-x-2">
                      <FaRegEdit className="text-blue-500 text-lg cursor-pointer" onClick={() => openEdit(order.id)} /> <MdDelete className="text-red-500 text-lg cursor-pointer" onClick={() => openDelete(order.id)} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <ManagerCreateModal
        isOpen={open}
        onClose={onCloseEdit}
        editData={selectedCoach}
        isEditMode={true}
        loadManagers={loadManagers}
      />
      <ConfirmModal
        isOpen={openConfirm}
        onClose={closeDelete}
        onConfirm={handleConfirmDelete}
        title={"Are you sure you want to delete the manager?"}
        loading={loading}
      />
    </div>
  );
}
