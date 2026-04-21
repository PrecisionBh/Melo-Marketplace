export const baseTemplate = (content: string) => `
  <div style="background:#F5F5F5;padding:24px 0;font-family:Arial, sans-serif;">
    
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">

          <!-- CARD -->
          <table width="420" cellpadding="0" cellspacing="0" style="
            background:#ffffff;
            border-radius:18px;
            padding:20px;
            box-shadow:0 6px 18px rgba(0,0,0,0.06);
          ">

            <!-- HEADER -->
            <tr>
              <td align="center" style="padding-bottom:16px;">
                <h1 style="
                  margin:0;
                  color:#D97732;
                  font-size:22px;
                  font-weight:800;
                ">
                  Melo Marketplace
                </h1>
              </td>
            </tr>

            <!-- CONTENT -->
            <tr>
              <td style="
                color:#111;
                font-size:14px;
                line-height:1.6;
              ">
                ${content}
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="
                padding-top:20px;
                text-align:center;
                font-size:12px;
                color:#888;
              ">
                This is an automated message from Melo Marketplace.<br/>
                © ${new Date().getFullYear()} Melo
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>

  </div>
`

/* 🔥 BUTTON COMPONENT */
export const emailButton = (text: string, url: string) => `
  <div style="text-align:center;margin:20px 0;">
    <a href="${url}" style="
      background:#D97732;
      color:#fff;
      padding:12px 18px;
      border-radius:12px;
      text-decoration:none;
      font-weight:700;
      display:inline-block;
    ">
      ${text}
    </a>
  </div>
`

/* 🔥 ORDER CONFIRMED */
export const orderConfirmedEmail = (order: any) =>
  baseTemplate(`
    <h2 style="margin-top:0;">Order Confirmed 🎉</h2>

    <p>Your order has been placed successfully.</p>

    <div style="
      background:#F9FAFB;
      border-radius:12px;
      padding:12px;
      margin-top:12px;
    ">
      <p style="margin:0;"><strong>Item:</strong> ${order.title}</p>
      <p style="margin:6px 0 0 0;">
        <strong>Total:</strong> $${(order.amount_cents / 100).toFixed(2)}
      </p>
    </div>

    ${emailButton(
      "View Order",
      `https://melomarketplace.app/orders/${order.id}`
    )}
  `)