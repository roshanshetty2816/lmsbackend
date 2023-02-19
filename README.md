# Library Management System

This is a MERN stack application built for easy and effctive Library management.

Website Link: https://librarymngsys.netlify.app/

## Description

### Performance
- This application employs clustering technique for **load balancing**, resulting in close to zero downtime for the website.
- The frontend uses **code splitting** to speed up the initial render and prevent the loading of irrelevant code in the browser for the user.

### Security
The application uses JsonWebTokens (JWT) for authentication to enhance security. Data validation and schema description libraries JOI and YUP are utilized to prevent any unauthorized data processing by the server.

### Features
The application caters to two types of users: Librarians and Patrons (General public). Both groups have access to different features tailored to their specific needs. The following is a list of features and their explanations for each type of user:
<pre>
Librarian:
a. Issue - The ability to issue books to users.
b. Return - The ability to un-issue books from users.
c. Requested Books - The ability to view books requested by users.
d. Cancel Request - The ability to cancel any requested book.
e. Issued Books - Access to a list of all issued books.
f. Un-Issued Books - Access to a list of all un-issued books.
g. Add Book - The ability to add books to the inventory.
h. Delete Book - The ability to delete books from the inventory.
i. All Users - Access to a list of all users enrolled in the library.
j. Delete User - The ability to delete a user from the library.
k. Newsletter - The ability to publish news to all subscribed users.
l. Inventory - Access to a list of all books in the library with the ability to search and filter based on various parameters.
m. Activity Logs - The ability to view the library's transaction logs.
n. Subscibers List - Access to a list of all subscribed users.
o. Block Users - The ability to block or unblock users.
p. Update Stock - The ability to update the quantity of books in the inventory.

Patrons (General User):
a. Request - The ability to request a book.
b. Issued Books - Access to a list of all books issued by them.
c. Inventory - Access to a list of all books in the Library.
d. Unsubscribe - The ability to unsubscribe from the library news.
e. Forgot PassWord - The ability to reset their password in case of forgetting it.
f. Rating Books - The ability to rate books they have issued.
g. Contact - The ability to contact the admin at any time.
h. Related Books - The ability to view all books related to a specific genre.
i. Review - The ability to rate and comment on books they have issued.
</pre>

### Other Features
Everyday at 10:00am, the server automatically sends reminder emails to all library users who have books due.

### General
This frontend of this website is hosted on Netlify and backend is hosted on Adaptable. 

## Getting Started

### Dependencies

#### Frontend

- redux-toolkit
- react-router-dom
- Material UI
- react-toastify
- formik
- yup
- axios
#### Backend

- JsonWebTokens(JWT)
- Joi
- bcryptjs
- mongoose
- express-async-handler
- nodemailer

#### Dev Dependencies

- nodemon

### Prerequisites

- Windows 10
- Any Code Editor

### Installing

For backend clone the repository by running the following command
<pre>
git clone https://github.com/roshanshetty28/lmsbackend.git
</pre>

For Frontend clone the repository by running the following command
<pre>
git clone https://github.com/roshanshetty28/lmsfrontend.git
</pre>

Then run the below command at the root of both backend and frontend to install all the dependencies
```
npm install
```

### Executing program

to run the Backend excute the following command in the root folder of backend
```
npm run srever
```
Make the following changes before running the frontend in your local machine
```
API_URL = http://localhost:{PORT_NUMBER}/
```
In authService.js, adminService.js and userService.js<br/>
to run the Frontend excute the following command in the root folder of frontend
```
npm run start
```

## Future Scope
These are following features which can be added further to this web-app to make it better.
- OAuth Sign-Up/Sign-In
- Caching Data
- Database Indexing
- Cookies
- View e-Books in realtime
- Implement Subscription Plan/Model
- Include fine payment
- Verify Email
- Include SMS feature

## Authors

Contributors names and contact info

<pre>
Roshan Ravi Shetty<br/>
LinkedIn:    https://www.linkedin.com/in/roshan-shetty-2000/
E-mail:      roshanshetty2816@gmail.com
Mobile No.:  +91 99306 56759
</pre>

## Improvements
- Automatic re-routing to unsubscribe route

## Version History

- 0.1
  - Initial Release
- 0.2
  - Second Release

## License

This project is licensed under the [MIT] License - see the LICENSE.md file for details

## Acknowledgments

Inspiration, code snippets, etc.

- [Stackoverflow](https://stackoverflow.com/)
- [Adaptable.io](https://adaptable.io)
- [Netlify](http://app.netlify.com)
- [Digital Ocean](https://www.digitalocean.com/community/tutorials/nodejs-cron-jobs-by-examples)