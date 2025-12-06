import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    console.log("SMTP not configured, skipping email");
    return false;
  }

  try {
    await transporter.sendMail({
      from: SMTP_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log("Email sent successfully to:", options.to);
    return true;
  } catch (error) {
    console.error("Email error:", error);
    return false;
  }
}

export async function sendTaskAssignmentEmail(params: {
  taskTitle: string;
  assigneeEmail: string;
  assigneeName: string;
  projectName: string;
  dueDate?: string;
  priority: string;
  action: "assigned" | "unassigned";
}): Promise<boolean> {
  const { taskTitle, assigneeEmail, assigneeName, projectName, dueDate, priority, action } = params;

  const subject = action === "assigned" 
    ? `Task Assigned: ${taskTitle}` 
    : `Task Unassignment: ${taskTitle}`;
  
  const html = action === "assigned" ? `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0f172a;">Task Assigned to You</h2>
          <p>Hi ${assigneeName},</p>
          <p>You have been assigned to a task in <strong>${projectName}</strong>:</p>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #0f172a;">${taskTitle}</h3>
            <p><strong>Priority:</strong> ${priority}</p>
            ${dueDate ? `<p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>` : ''}
          </div>
          
          <p>Please log in to AgencyFlow to view the task details and start working on it.</p>
          
          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>AgencyFlow Team</strong>
          </p>
        </div>
      </body>
    </html>
  ` : `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0f172a;">Task Unassignment</h2>
          <p>Hi ${assigneeName},</p>
          <p>You have been unassigned from a task in <strong>${projectName}</strong>:</p>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #0f172a;">${taskTitle}</h3>
          </div>
          
          <p>You are no longer responsible for this task.</p>
          
          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>AgencyFlow Team</strong>
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({ to: assigneeEmail, subject, html });
}

export async function sendProjectMemberEmail(params: {
  memberEmail: string;
  memberName: string;
  projectName: string;
  action: "added" | "removed";
}): Promise<boolean> {
  const { memberEmail, memberName, projectName, action } = params;

  const subject = action === "added" 
    ? `Added to Project: ${projectName}` 
    : `Removed from Project: ${projectName}`;
  
  const html = action === "added" ? `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0f172a;">Added to Project</h2>
          <p>Hi ${memberName},</p>
          <p>You have been added to the project <strong>${projectName}</strong>.</p>
          <p>You can now view and work on tasks within this project.</p>
          <p>Please log in to AgencyFlow to see the project details.</p>
          
          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>AgencyFlow Team</strong>
          </p>
        </div>
      </body>
    </html>
  ` : `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0f172a;">Removed from Project</h2>
          <p>Hi ${memberName},</p>
          <p>You have been removed from the project <strong>${projectName}</strong>.</p>
          <p>You no longer have access to this project.</p>
          
          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>AgencyFlow Team</strong>
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({ to: memberEmail, subject, html });
}

export async function sendNotificationEmail(params: {
  email: string;
  name: string;
  title: string;
  message: string;
  link?: string;
}): Promise<boolean> {
  const { email, name, title, message, link } = params;

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0f172a;">${title}</h2>
          <p>Hi ${name},</p>
          <p>${message}</p>
          ${link ? `<p><a href="${link}" style="color: #2563eb;">View Details</a></p>` : ''}
          
          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>AgencyFlow Team</strong>
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({ to: email, subject: title, html });
}
