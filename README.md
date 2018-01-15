# CoursePlanner-WebSite
an up-to-date Course Planner for Bogazici University Students

# http://www.bouncourseplanner.com

Stack: React,HTML,CSS and NodeJS

**Front-end:** https://github.com/simitii/CoursePlanner-WebSite

**Back-end:** https://github.com/simitii/CoursePlanner-BackEnd

# Explanation
Instead of keeping a database of courses, this project aims to get **lastest data** from the original source(Boun Registration Web Site) whenever a user needs course information since course informations are updated frequently.

However, there is a trick which is to **avoid excessive usage of the original source**(Boun Registration Web Site) . We achieve that by using **request-response-caching mechanism of nginx on the production**. We cache request and their corresponding responses for a while(e.g  1hour). This also improves scalability of our server site code.


# Fixed Bugs:
**Hidden Departments**: Some courses appear with sub-department code. Since our design aims to access information from shortest path, it uses department code to find courses. However, sub-department should be explored in order to access courses with sub-department code. Solution is to explore departments and store sub-department codes in the memory and repeat this process after a while (e.g. every 72 hours).

**Multiple Departments with same department code**
