import React, { useContext, useState } from "react";
import classes from "./Payment.module.css";
import LayOut from '../../Components/Layout/LayOut';
import { DataContext } from "../../Components/DataProvider/DataProvider";
import ProductCard from "../../Components/Product/ProductCard";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";

import CurrencyFormat from "../../Components/CurrencyFormat/CurrencyFormat";
import { axiosInstance } from '../../Api/axios';
import { ClipLoader } from "react-spinners";
import { db } from "../../utility/firebase";
import { useNavigate } from "react-router-dom";
import { Type } from '../../utility/action.type';

function Payment() {
  const [{ user, basket }, dispatch] = useContext(DataContext);
  // console.log(user);

  const totalItem = basket?.reduce((amount, item) => {
    return item.amount + amount;
  }, 0);

  const total = basket?.reduce((amount, item) => {
    return item.price * item.amount + amount;
  }, 0);

  const [cardError, setCardError] = useState(null)
  const [processing, setProcessing] = useState(false)

  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();


  const handleChange = (event)=> {
    // console.log(e);
    event?.error?.message? setCardError(event?.error?.message): setCardError("")
  };

  const handlePayment = async (event) => {
    event.preventDefault();

    try {
      setProcessing(true);
      // 1. backend || functions ---> contact to the client secret
      const response = await axiosInstance({
        method: "POST",
        url: `/payment/create?total=${total * 100}`,
      });

      // console.log(response.data);
      const clientSecret = response.data?.clientSecret;
console.log(clientSecret)
      // 2. client side (react side confirmation)
      const { paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      console.log(paymentIntent);

      // 3. after the confirmation --> order firestore database save, clear basket
      
        await db
        .collection("users")
        .doc(user.uid)
        .collection("orders")
        .doc(paymentIntent.id)
        .set({
          basket: basket,
          amount: paymentIntent.amount,
          created: paymentIntent.created,
        });
      // empty the basket
      dispatch({ type: Type.EMPTY_BASKET });
      setProcessing(false);
      navigate("/orders", { state: {
        message: "You haave placed a new order."
      } });

      } catch (error) {
        console.error(error)
        setProcessing(false)
      }
      } 

  return (
    <LayOut> 
{/* Header */}
        <div className={classes.Payment__header}>
          Checkout ({totalItem}) items
        </div>
{/* Payment method */}
        <section className={classes.Payment}>
{/* address */}
<div className={classes.flex}>
  <h3>Delivery Address</h3>
  <div>
    {user? (
      <>
        <div>{user.email}</div>
        <div>333 preston dr</div>
        <div>Dallas, Tx</div>
      </>
    ) : (
      <div>Loading user data...</div>
    )}
  </div>
</div>
        <hr />

{/* products */}
<div className={classes.flex}>
  <h3>Review items and Delivery</h3>
  <div>
    {
      basket?.map((item, i) => (
        <ProductCard 
          product={item} 
          flex={true}
          key={i}
        />
      ))
    }
  </div>
</div>

        <hr />
{/* card form */}
        <div className={classes.flex}>
          <h3>Payment methods</h3>
          <div className={classes.Payment__card__container}>
            <div className={classes.payment__details}>
              <form onSubmit={handlePayment}>
                {/* error */}
                {cardError && ( <small style={{color: "red" }}>{cardError}</small>
                )}
                {/* card element*/}
                <CardElement onChange={handleChange}/>

                {/* price to pay */}
                <div className={classes.payment__price}>
                    <p style={{display:"flex", gap:"10px"}}>
                      Total Order | <h4><CurrencyFormat amount={total}/></h4> 
                    </p>
                  <button type='submit'>
                    {
                      processing? (
                        <div className={classes.processing}>
                          <ClipLoader color='gray' size={12}/>
                          <p>Please Wait ...</p>
                        </div>
                      ): "Pay Now"
                    } 
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        </section>
    </LayOut>
  )
}

export default Payment