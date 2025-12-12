import { useState, useEffect, useRef } from "react";
import {
  Button,
  Card,
  Tabs,
  Badge,
  Row,
  Col,
  Typography,
  Layout,
  Alert,
  Space,
  Modal,
  notification,
} from "antd";
import { CheckCircleOutlined, CloseOutlined, LogoutOutlined, PrinterOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import styles from "./Page3.module.css";
import { IoClose } from "react-icons/io5";
import { MdTranslate } from "react-icons/md";
import { RiAiGenerate } from "react-icons/ri";
import { LoadingOutlined } from "@ant-design/icons";
import { Spin } from "antd";
import translations from "../../../../utils/translations.jsx";
import { useAuth } from "../../../../contexts/AuthContext.jsx";
import axios from "axios";
import DateAndTime from "../DateAndTime/DateAndTime.jsx";
import { useMealData } from "../../../../contexts/MealDataContext.jsx";
import OrderReceiptPrinter from "../../../../utils/orderprint.js";

const { Content } = Layout;
const { Title, Text } = Typography;

const Loading = ({ text }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      width: "100vw",
      position: "fixed",
      top: 0,
      left: 0,
      zIndex: 9999,
      background: "rgba(255, 255, 255, 0.7)",
      backdropFilter: "blur(4px)",
    }}
  >
    <Spin
      indicator={
        <LoadingOutlined style={{ fontSize: 75, color: "#5D071C" }} spin />
      }
    />
    {text && (
      <div
        style={{
          marginTop: "16px",
          fontSize: "16px",
          fontFamily: '"Figtree", sans-serif',
          color: "#5D071C",
          textAlign: "center",
        }}
      >
        {text}
      </div>
    )}
  </div>
);

const Page3 = ({
  language = "english",
  username,
  userId,
  carouselRef,
  setResetPin,
  isActive = true,
}) => {
  const { authData } = useAuth();
  const baseURL = import.meta.env.VITE_BASE_URL;
  const {
    mealTimes,
    allMeals,
    isDataLoaded,
    isLoading: contextLoading,
    getMealsForType,
    getAvailableMealTimes,
    clearData,
  } = useMealData(); // Use meal data context

  const [baseTime, setBaseTime] = useState(null);
  const currentTimeRef = useRef(new Date());
  const [selectedDate, setSelectedDate] = useState("today");
  const [selectedMealTime, setSelectedMealTime] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [meals, setMeals] = useState([]);
  const [_, setRenderTrigger] = useState(0); // For forcing re-render
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [thermalPrinter, setThermalPrinter] = useState(null);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [printingOrder, setPrintingOrder] = useState(false);
  const text = translations[language];

  // Initialize thermal printer
  useEffect(() => {
    const initThermalPrinter = async () => {
      try {
        const printer = new OrderReceiptPrinter();
        setThermalPrinter(printer);
        console.log('Thermal printer service initialized');
      } catch (error) {
        console.error('Failed to initialize thermal printer:', error);
      }
    };

    initThermalPrinter();
  }, []);

  // Get organizationId from username prop
  const organizationId = username?.organizationId;

  // Debug log to verify organizationId is received
  useEffect(() => {
    console.log("Page3 received username:", username);
    console.log("Page3 received organizationId:", organizationId);
    console.log("Page3 received userId:", userId);
  }, [username, organizationId, userId]);

  // Show welcome modal when page becomes active
  useEffect(() => {
    if (isActive && userId && username) {
      setShowSuccess(true);

      // Auto-logout after 3 seconds
      const timer = setTimeout(() => {
        setShowSuccess(false);
        carouselRef.current?.goTo(1);
        setResetPin(true);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isActive, userId, username, carouselRef, setResetPin]);

  useEffect(() => {
    const initTime = () => {
      const localTime = new Date();
      currentTimeRef.current = localTime;
      setBaseTime(localTime);

      // Set loading to false if data is already loaded from context
      setLoading(!isDataLoaded);
    };

    initTime();

    const timer = setInterval(() => {
      currentTimeRef.current = new Date();
      if (currentTimeRef.current.getSeconds() === 0) {
        setRenderTrigger((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isDataLoaded]);

  // Update loading state based on context data loading
  useEffect(() => {
    setLoading(contextLoading || !isDataLoaded);
  }, [contextLoading, isDataLoaded]);

  // Set initial meal time when meal times are loaded from context
  useEffect(() => {
    if (isDataLoaded && mealTimes && mealTimes.length >= 2) {
      const availableMealTimes = getAvailableMealTimes(selectedDate);
      if (availableMealTimes.length > 0 && !selectedMealTime) {
        setSelectedMealTime(availableMealTimes[0].id);
      }
    }
  }, [isDataLoaded, mealTimes, selectedDate, selectedMealTime, getAvailableMealTimes]);

  // Update selected meal time when date changes
  useEffect(() => {
    if (isDataLoaded) {
      const availableMealTimes = getAvailableMealTimes(selectedDate);
      if (availableMealTimes.length > 0) {
        const validMealTime =
          availableMealTimes.find((meal) => isMealTimeAvailable(meal)) ||
          availableMealTimes[0];
        setSelectedMealTime(validMealTime?.id || null);
      } else {
        setSelectedMealTime(null);
      }
    }
  }, [selectedDate, isDataLoaded, getAvailableMealTimes]);

  // Use meals from context instead of fetching
  useEffect(() => {
    if (isDataLoaded && selectedMealTime) {
      const mealsForType = getMealsForType(selectedDate, selectedMealTime);
      setMeals(mealsForType);
      console.log("Meals loaded from context:", selectedDate, selectedMealTime, mealsForType);
    } else {
      setMeals([]);
    }
  }, [isDataLoaded, selectedDate, selectedMealTime, getMealsForType]);

  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString("en-IN");
  };

  const isMealTimeAvailable = (mealTimeItem) => {
    if (selectedDate !== "today") return true;
    if (
      !mealTimeItem.time ||
      !Array.isArray(mealTimeItem.time) ||
      mealTimeItem.time.length < 2
    ) {
      return false;
    }

    const [, endTimeStr] = mealTimeItem.time;
    console.log(mealTimeItem.name, endTimeStr);
    const [endHour, endMinute] = endTimeStr.split(":").map(Number);

    const now = currentTimeRef.current;
    const endTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      endHour,
      endMinute
    );

    return now <= endTime;
  };

  const toggleOrderItem = (mealId) => {
    setOrderItems((prev) => {
      const exists = prev.some(
        (item) =>
          item.mealId === mealId &&
          item.mealTime === selectedMealTime &&
          item.date === selectedDate
      );
      if (exists) {
        return prev.filter(
          (item) =>
            !(
              item.mealId === mealId &&
              item.mealTime === selectedMealTime &&
              item.date === selectedDate
            )
        );
      }
      return [
        ...prev,
        { mealId, date: selectedDate, mealTime: selectedMealTime, count: 1 },
      ];
    });
  };

  const updateOrderItemCount = (mealId, date, mealTime, increment = true) => {
    setOrderItems((prev) => {
      const index = prev.findIndex(
        (item) =>
          item.mealId === mealId &&
          item.date === date &&
          item.mealTime === mealTime
      );
      if (index === -1) {
        return [...prev, { mealId, date, mealTime, count: 1 }];
      }
      const updatedItems = [...prev];
      if (increment) {
        updatedItems[index] = {
          ...updatedItems[index],
          count: updatedItems[index].count + 1,
        };
      } else if (updatedItems[index].count > 1) {
        updatedItems[index] = {
          ...updatedItems[index],
          count: updatedItems[index].count - 1,
        };
      } else {
        updatedItems.splice(index, 1);
      }
      return updatedItems;
    });
  };

  const fetchMealSuggestions = async () => {
    if (!userId || !selectedMealTime || !organizationId) {
      console.log("Missing userId, selectedMealTime, or organizationId for suggestions");
      return;
    }

    setLoadingSuggestions(true);

    try {
      const baseDate =
        selectedDate === "today"
          ? baseTime
          : new Date(baseTime.getTime() + 24 * 60 * 60 * 1000);
      const formattedDate = baseDate.toLocaleDateString("en-CA");

      const response = await axios.get(
        `${baseURL}/meal/suggestions/${userId}`,
        {
          params: {
            date: formattedDate,
            mealTypeId: selectedMealTime,
            orgId: organizationId,
          },
        }
      );

      console.log("Suggestions response:", response.data);
      setSuggestions(response.data || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error fetching meal suggestions:", error);

      if (error.response?.status === 404) {
        // No meals scheduled for this date/time
        if (error.response.data?.message?.includes("No meals found")) {
          setSuggestions([]);
          setShowSuggestions(true); // Still show modal with "no suggestions" message
        } else {
          console.error("User not found for suggestions");
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(true);
      }
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const connectThermalPrinter = async () => {
    if (!thermalPrinter) {
      notification.error({
        message: 'Printer Error',
        description: 'Thermal printer service not initialized',
        placement: 'topRight',
      });
      return false;
    }

    try {
      notification.info({
        message: 'Connecting to Printer',
        description: 'Please select your thermal printer from the list. Look for names containing "Thermal", "Receipt", "POS", or printer brand names like EPSON, Star, Citizen.',
        placement: 'topRight',
        duration: 6,
      });

      await thermalPrinter.connectPrinter();
      setIsPrinterConnected(true);

      notification.success({
        message: 'Printer Connected',
        description: `Thermal printer connected successfully. Device: ${thermalPrinter.thermalPrinter.device?.name || 'Unknown'}`,
        placement: 'topRight',
      });
      return true;
    } catch (error) {
      console.error('Failed to connect thermal printer:', error);
      setIsPrinterConnected(false);

      let errorMessage = 'Failed to connect to thermal printer';
      let errorDescription = error.message || 'Unknown error occurred';

      // Provide specific guidance based on error type
      if (error.message.includes('not supported')) {
        errorDescription = 'Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.';
      } else if (error.message.includes('cancelled')) {
        errorDescription = 'Connection was cancelled. Please try again and select a thermal printer.';
      } else if (error.message.includes('pairing mode')) {
        errorDescription = 'No thermal printers found. Please ensure your printer is powered on and in pairing mode.';
      } else if (error.message.includes('No writable characteristic')) {
        errorDescription = 'The selected device does not support thermal printing. Please select a different device.';
      }

      notification.error({
        message: errorMessage,
        description: errorDescription,
        placement: 'topRight',
        duration: 8,
      });
      return false;
    }
  };

  const printOrderReceipt = async (orderResponse, orderItems, mealTime, orderDate) => {
    if (!thermalPrinter) {
      console.warn('Thermal printer not available');
      return;
    }

    setPrintingOrder(true);
    try {
      // Connect printer if not connected
      if (!isPrinterConnected) {
        const connected = await connectThermalPrinter();
        if (!connected) {
          setPrintingOrder(false);
          return;
        }
      }

      // Generate order ID from response or create one
      const orderId = orderResponse?.id || orderResponse?.orderId || `ORD${Date.now()}`;

      // Get meal type name - use the specific mealTime passed as parameter
      const mealTypeName = availableMealTimes.find(m => m.id === mealTime)?.name || 'Unknown';

      // Prepare order items for printing (only items for this specific order)
      const printItems = orderItems.map(item => {
        const meal = allMeals.find(m => m.id === item.mealId);
        return {
          name: meal ? (meal[`name${language.charAt(0).toUpperCase() + language.slice(1)}`] || meal.nameEnglish || 'Unknown Meal') : 'Unknown Meal',
          quantity: item.count,
          price: meal ? meal.price : 0
        };
      });

      // Calculate total price for this specific order
      const totalPrice = printItems.reduce((total, item) => total + (item.price * item.quantity), 0);

      // Format the order date from the database response
      const formattedOrderDate = orderDate ?
        new Date(orderDate).toLocaleDateString('en-IN') :
        new Date().toLocaleDateString('en-IN');

      // Current system date and time for receipt printing
      const currentDateTime = new Date();
      const currentPrintTime = `${currentDateTime.toLocaleDateString('en-IN')} ${currentDateTime.toLocaleTimeString('en-IN')}`;

      // Prepare order data for printing
      const orderData = {
        orderId: orderId,
        username: username?.name || 'Guest',
        orderDate: formattedOrderDate, // Use the actual order date from database
        orderTime: currentPrintTime,   // Use current system time for receipt
        mealType: text[mealTypeName] || mealTypeName,
        items: printItems,
        totalPrice: totalPrice
      };

      console.log('Printing individual order receipt:', {
        orderId,
        mealType: mealTypeName,
        orderDate: formattedOrderDate,
        printDateTime: currentPrintTime,
        itemCount: printItems.length,
        totalPrice
      });

      // Print the receipt
      await thermalPrinter.printOrder(orderData);

      notification.success({
        message: 'Receipt Printed',
        description: `Order receipt (${orderId}) for ${text[mealTypeName] || mealTypeName} printed successfully`,
        placement: 'topRight',
        icon: <PrinterOutlined style={{ color: '#52c41a' }} />,
        duration: 3,
      });

    } catch (error) {
      console.error('Failed to print order receipt:', error);
      notification.error({
        message: 'Print Failed',
        description: error.message || 'Failed to print order receipt',
        placement: 'topRight',
      });
    } finally {
      setPrintingOrder(false);
    }
  };

  const placeOrder = async () => {
    const groupedOrders = orderItems.reduce((acc, item) => {
      const key = `${item.date}-${item.mealTime}`;
      if (!acc[key]) {
        acc[key] = {
          date: `${item.date}`,
          mealTime: item.mealTime,
          meals: {},
          totalPrice: 0,
          orderItems: [], // Store order items for this specific order
        };
      }
      acc[key].meals[item.mealId] =
        (acc[key].meals[item.mealId] || 0) + item.count;
      const meal = allMeals.find((meal) => meal.id === item.mealId);
      acc[key].totalPrice += meal ? meal.price * item.count : 0;

      // Add this item to the specific order's items
      acc[key].orderItems.push(item);
      return acc;
    }, {});

    try {
      const orderResponses = []; // Store all order responses for printing receipts

      for (const key in groupedOrders) {
        const { date, mealTime, meals, totalPrice } = groupedOrders[key];
        const mealsArray = Object.entries(meals).map(
          ([mealId, count]) => `${mealId}:${count}`
        );

        const orderPlacedTime = currentTimeRef.current.toISOString();
        // Use the specific date from this grouped order (not the currently selected date)
        const orderDate =
          date === "today"
            ? currentTimeRef.current.toISOString()
            : new Date(
              currentTimeRef.current.getTime() + 24 * 60 * 60 * 1000
            ).toISOString();

        console.log(`🗓️ Order date calculation for ${key}:`, {
          orderKey: key,
          orderDateType: date,
          calculatedOrderDate: orderDate,
          mealTime: mealTime,
          currentlySelectedDate: selectedDate
        });

        const orderData = {
          employeeId: userId || "unknown",
          orgId: organizationId,
          meals: mealsArray,
          orderDate,
          mealTypeId: mealTime,
          price: totalPrice,
          serve: false,
          orderPlacedTime,
        };

        console.log(
          "Sending order payload:",
          JSON.stringify(orderData, null, 2)
        );
        const response = await axios.post(
          `${baseURL}/orders`,
          orderData
        );

        console.log("Order response:", {
          status: response.status,
          data: response.data,
        });

        if (response.status < 200 || response.status >= 300) {
          console.error("Order failed:", {
            status: response.status,
            data: response.data,
            message: response.statusText,
          });
          throw new Error(`Failed to place order: ${response.statusText}`);
        }

        // Store order response with its corresponding items
        orderResponses.push({
          orderResponse: response.data,
          orderItems: groupedOrders[key].orderItems,
          mealTime: mealTime,
          orderDate: orderDate
        });
      }

      setShowSuccess(true);

      // Print separate receipts for each order (don't block the success display)
      if (orderResponses.length > 0 && thermalPrinter) {
        // Add small delay to ensure orders are processed
        setTimeout(async () => {
          try {
            for (let i = 0; i < orderResponses.length; i++) {
              const { orderResponse, orderItems: specificOrderItems, mealTime, orderDate } = orderResponses[i];

              console.log(`Printing receipt ${i + 1} of ${orderResponses.length}:`, {
                orderId: orderResponse?.id || orderResponse?.orderId,
                mealTime,
                itemCount: specificOrderItems.length
              });

              // Print receipt for this specific order
              await printOrderReceipt(orderResponse, specificOrderItems, mealTime, orderDate);

              // Add delay between receipts to prevent printer buffer overflow
              if (i < orderResponses.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }

            notification.success({
              message: 'All Receipts Printed',
              description: `Successfully printed ${orderResponses.length} receipt(s)`,
              placement: 'topRight',
              icon: <PrinterOutlined style={{ color: '#52c41a' }} />,
            });
          } catch (printError) {
            console.error('Failed to print receipts:', printError);
            notification.error({
              message: 'Print Failed',
              description: `Failed to print some receipts: ${printError.message}`,
              placement: 'topRight',
            });
          }
        }, 500);
      }

      // Show success modal for 3 seconds, then logout and return to page 1
      setTimeout(() => {
        setShowSuccess(false);
        setOrderItems([]);
        carouselRef.current?.goTo(1);
        setResetPin(true);
      }, 5000);
    } catch (error) {
      console.log(error);
      setShowError(true);
      setTimeout(() => setShowError(false), 1000);
    }
  };

  const isMealSelected = (mealId) =>
    orderItems.some(
      (item) =>
        item.mealId === mealId &&
        item.mealTime === selectedMealTime &&
        item.date === selectedDate
    );

  const availableMealTimes = getAvailableMealTimes(selectedDate);

  // Only show loading animations if user has actually progressed to Page3 (has userId)
  // This prevents loading animations when going back to Page1/Page2
  if (!userId) return null;

  if (!baseTime) return <Loading text={text.loading || "Initializing..."} />;

  // Wait for organizationId to be available
  if (!organizationId) return <Loading text="Loading organization data..." />;

  return (
    <>
      {loading && <Loading text={text.loading || "Loading meals..."} />}
      <Layout className={styles.layout}>
        {/* Success Modal */}
        <Modal
          open={showSuccess}
          footer={null}
          closable={false}
          centered
          bodyStyle={{
            padding: "40px",
            textAlign: "center",
            background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
            borderRadius: "12px",
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <CheckCircleOutlined
              style={{
                fontSize: "64px",
                color: "#22c55e",
                marginBottom: "20px",
              }}
            />
            <Title level={2} style={{ color: "#166534", margin: "0 0 10px 0" }}>
              {text.welcome || "Welcome"}, {username?.name || "User"}!
            </Title>
            <Badge
              count="PAID USER"
              style={{
                backgroundColor: "#22c55e",
                color: "#fff",
                fontSize: "14px",
                fontWeight: "bold",
                padding: "4px 12px",
                marginBottom: "20px",
              }}
            />
            <Text
              style={{
                fontSize: "18px",
                color: "#15803d",
                display: "block",
                marginTop: "20px",
                fontWeight: "500",
              }}
            >
              {text.doorUnlocked || "Door unlocked, you can enter"}
            </Text>
          </motion.div>
        </Modal>


      </Layout>
    </>
  );
};

export default Page3;
