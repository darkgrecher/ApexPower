import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Table, Space, Modal, ConfigProvider, Select, Popconfirm, Dropdown, Button } from "antd";
import { FiEdit } from "react-icons/fi";
import { MdOutlineDeleteOutline } from "react-icons/md";
import { DownOutlined } from "@ant-design/icons";
import EditModal from "../../../templates/HR/EditModal/EditModal.jsx";
import Loading from "../../../atoms/loading/loading.jsx";
import styles from "./Employee.module.css";
import SearchBar from "../../../molecules/SearchBar/SearchBar.jsx";
import { Toaster, toast } from "sonner";
import { useAuth } from "../../../../contexts/AuthContext.jsx";
import debounce from 'just-debounce-it';
import { usePopup } from "../../../../contexts/PopupContext.jsx";
import { useTheme } from "../../../../contexts/ThemeContext.jsx";

// Theme configurations
const getCustomTheme = () => ({
  components: {
    Table: {
      fontSize: 12,
      cellPaddingBlock: 12,
      fontFamily: '"Figtree", sans-serif',
    },
    Popconfirm: {
      colorText: "#333333",
      colorTextHeading: "#333333",
    },
  },
});

const getDarkTheme = () => ({
  components: {
    Table: {
      fontSize: 12,
      cellPaddingBlock: 12,
      fontFamily: '"Figtree", sans-serif',
      colorBgContainer: "#2a2a2a",
      colorText: "#ffffff",
      headerBg: "#1e40af",
      headerColor: "#ffffff",
      rowHoverBg: "#374151",
    },
    Pagination: {
      colorBgContainer: "#303030",
      colorText: "#ffffff",
      colorBorder: "#404040",
      itemActiveBg: "#404040",
    },
    Popconfirm: {
      colorBgElevated: "#374151",
      colorText: "#ffffff",
      colorTextHeading: "#ffffff",
      colorBorder: "#4b5563",
    },
  },
});

const roleMap = {
  KITCHEN_ADMIN: "Kitchen Administrator",
  KITCHEN_STAFF: "Kitchen Staff",
  HR_ADMIN: "Human Resource Manager",
};

const Employees = () => {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState();
  const [frole, setFrole] = useState();
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employee, setEmployee] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const urL = import.meta.env.VITE_BASE_URL;
  const { authData } = useAuth();
  const token = authData?.accessToken;
  const { theme } = useTheme();

  const { success, error } = usePopup();

  const openModal = (empId) => {
    setSelectedEmployee(empId);
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const fetchEmployee = async (searchValue, roleValue) => {
    try {
      const response = await axios.get(`${urL}/user`, {
        params: {
          search: searchValue || undefined,
          role: roleValue || undefined,
          orgId: authData?.orgId,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const fetchedEmployee = response.data.map((emp) => ({
        key: emp.id,
        no: emp.empNo,
        id: emp.id,
        name: emp.name,
        role: emp.role,
        email: emp.email,
        paymentStatus: emp.paymentStatus,
      }));
      setEmployee(fetchedEmployee);
      setLoading(false);
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  };

  //Preventing instant API calls when searching
  const debouncedFetch = useCallback(
    debounce((searchValue, roleValue) => {
      fetchEmployee(searchValue, roleValue);
    }, 300),
    []
  );

  const handleDelete = async (id, email) => {
    setLoading(true);
    try {
      await axios.delete(`${urL}/user/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      await axios.post(
        `${urL}/auth/delete`,
        { email: email },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      fetchEmployee();
      success("User Removed Successfully!");
    } catch (err) {
      console.log(err);
      error("Something went Wrong!");
    }
    setLoading(false);
  };

  const handlePaymentStatusUpdate = async (userId, newPaymentStatus) => {
    try {
      setLoading(true);
      await axios.put(
        `${urL}/user/${userId}/payment-status`,
        { paymentStatus: newPaymentStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update the local state to reflect the change immediately
      setEmployee(prevEmployees =>
        prevEmployees.map(emp =>
          emp.id === userId ? { ...emp, paymentStatus: newPaymentStatus } : emp
        )
      );

      success(`Payment status updated to ${newPaymentStatus ? 'Paid' : 'Unpaid'}`);
    } catch (err) {
      console.log(err);
      error("Failed to update payment status!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployee();
  }, []);

  useEffect(() => {
    debouncedFetch(search, frole);
  }, [search, frole, debouncedFetch]);

  if (loading) {
    return <Loading type={theme === "dark" ? "dark" : undefined} />;
  }

  const columns = [
    {
      title: "Employee No",
      dataIndex: "no",
      key: "no",
      align: "center",
      sorter: (a, b) => {
        // Extract alphabetic and numeric parts
        const parseEmpNo = (empNo) => {
          const match = empNo.match(/^([A-Za-z]*)(\d+)$/);
          if (match) {
            return {
              alpha: match[1] || '',
              numeric: parseInt(match[2], 10)
            };
          }
          // Fallback for pure numbers
          const numMatch = empNo.match(/^\d+$/);
          if (numMatch) {
            return {
              alpha: '',
              numeric: parseInt(empNo, 10)
            };
          }
          // Fallback for anything else
          return {
            alpha: empNo,
            numeric: 0
          };
        };

        const aParsed = parseEmpNo(a.no);
        const bParsed = parseEmpNo(b.no);

        // First sort by alphabetic part
        if (aParsed.alpha !== bParsed.alpha) {
          return aParsed.alpha.localeCompare(bParsed.alpha);
        }

        // Then sort by numeric part
        return aParsed.numeric - bParsed.numeric;
      },
      ellipsis: true,
      onHeaderCell: () => ({
        className: styles.tableHeaderCell,
      }),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      align: "center",
      ellipsis: true,
      onHeaderCell: () => ({
        className: styles.tableHeaderCell,
      }),
    },
    {
      title: "Job Role",
      dataIndex: "role",
      key: "role",
      align: "center",
      ellipsis: true,
      render: (role) => roleMap[role] || role,
      onHeaderCell: () => ({
        className: styles.tableHeaderCell,
      }),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      align: "center",
      ellipsis: true,
      onHeaderCell: () => ({
        className: styles.tableHeaderCell,
      }),
    },
    {
      title: "Payment Status",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      align: "center",
      ellipsis: true,
      render: (paymentStatus) => (
        <span
          style={{
            color: paymentStatus ? "#52c41a" : "#ff4d4f",
            fontWeight: "600",
          }}
        >
          {paymentStatus ? "Paid" : "Unpaid"}
        </span>
      ),
      onHeaderCell: () => ({
        className: styles.tableHeaderCell,
      }),
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      render: (_, record) => {
        // Hide delete button if this is the logged-in user
        const isCurrentUser = record.id === authData?.user?.id;

        // Payment status dropdown menu items
        const paymentMenuItems = [
          {
            key: 'paid',
            label: (
              <span style={{ color: '#52c41a', fontWeight: '600' }}>
                Mark as Paid
              </span>
            ),
            onClick: () => handlePaymentStatusUpdate(record.id, true),
          },
          {
            key: 'unpaid',
            label: (
              <span style={{ color: '#ff4d4f', fontWeight: '600' }}>
                Mark as Unpaid
              </span>
            ),
            onClick: () => handlePaymentStatusUpdate(record.id, false),
          },
        ];

        return (
          <Space size="small">
            <FiEdit
              onClick={() => openModal(record.id)}
              className={styles.icons}
              color={theme === "dark" ? "#ffffff" : "black"}
              size="15px"
              title="Edit User"
            />

            <Dropdown
              menu={{ items: paymentMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button
                size="small"
                type="text"
                style={{
                  color: theme === "dark" ? "#ffffff" : "#1890ff",
                  fontWeight: "500",
                  fontSize: "12px"
                }}
              >
                Payment <DownOutlined />
              </Button>
            </Dropdown>

            {!isCurrentUser && (
              <Popconfirm
                title={
                  <span
                    className={`${styles.popconfirmTitle} ${theme === "dark" ? styles.darkPopconfirmTitle : ""
                      }`}
                  >
                    Delete User {record.id}
                  </span>
                }
                placement="bottom"
                onConfirm={() => handleDelete(record.id, record.email)}
                description={
                  <span
                    className={`${styles.popconfirmDescription} ${theme === "dark" ? styles.darkPopconfirmDescription : ""
                      }`}
                  >
                    Are You Sure to Delete
                  </span>
                }
                okText={
                  <span
                    className={`${styles.popconfirmButton} ${theme === "dark" ? styles.darkPopconfirmButton : ""
                      }`}
                  >
                    Yes
                  </span>
                }
                cancelText={
                  <span
                    className={`${styles.popconfirmButton} ${theme === "dark" ? styles.darkPopconfirmButton : ""
                      }`}
                  >
                    No
                  </span>
                }
              >
                <MdOutlineDeleteOutline
                  color={theme === "dark" ? "white" : "red"}
                  className={styles.icons}
                  size="17px"
                  title="Delete User"
                />
              </Popconfirm>
            )}
          </Space>
        );
      },
      onHeaderCell: () => ({
        className: styles.tableHeaderCell,
      }),
    },
  ];

  return (
    <>
      <Toaster richColors />
      <Modal
        open={isModalOpen}
        footer={null}
        width="66vw"
        onCancel={handleCancel}
        styles={{
          mask: {
            backdropFilter: "blur(12px)",
          },
        }}
      >
        <EditModal
          empId={selectedEmployee}
          handleCancel={handleCancel}
          fetchEmployee={fetchEmployee}
        />
      </Modal>

      <div className={`${styles.home} ${theme === "dark" ? styles.dark : ""}`}>
        <div className={styles.homeContent}>
          <div className={styles.homeHead}>
            <div className={styles.headLeft}>Registered Employee Details</div>
            <div className={styles.headRight}>
              <SearchBar
                onChange={(e) => setSearch(e.target.value)}
                placeholder={"Search Employee"}
                className={styles.searchBarSpacing}
              />

              <Select
                showSearch
                allowClear
                onChange={(value) => setFrole(value)}
                placeholder="Select Role"
                className={styles.filter}
                optionFilterProp="label"
                options={[
                  {
                    value: "HR_ADMIN",
                    label: "Human Resource Manager",
                  },
                  {
                    value: "Kitchen_Admin",
                    label: "Kitchen Administrator",
                  },
                  {
                    value: "Kitchen_Staff",
                    label: "Kitchen Staff",
                  },
                ]}
              />
            </div>
          </div>
          <ConfigProvider
            theme={theme === "dark" ? getDarkTheme() : getCustomTheme()}
          >
            <div className={styles.contentBox}>
              <Table
                columns={columns}
                dataSource={employee}
                rowClassName={(record, index) =>
                  theme === "dark"
                    ? `${styles.customTableRowDark} ${index % 2 === 0 ? styles.evenRowDark : styles.oddRowDark
                    }`
                    : `${styles.customTableRow} ${index % 2 === 0 ? styles.evenRow : styles.oddRow
                    }`
                }
                pagination={{
                  position: ["bottomCenter"],
                  pageSize: 25,
                  showTotal: (total, range) =>
                    `${range[0]}–${range[1]} of ${total} items`,
                  showSizeChanger: false,
                }}
              />
            </div>
          </ConfigProvider>
        </div>
      </div>
    </>
  );
};

export default Employees;
