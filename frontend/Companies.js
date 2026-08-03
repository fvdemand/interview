const searchWrapperClasses = "relative w-3/4";
const searchInputClasses = "form-control h-12 text-content text-base rounded-sm pl-2.5 pr-10";
const searchIconClasses = "fa-solid fa-magnifying-glass absolute left-[90%] top-1/2 -translate-y-1/2 text-blue-700";

const Companies = () => {

   const [isSubmittingForm, setIsSubmittingForm] = useState(false);
   const [companiesList, setcompaniesList] = useState([]);
   const { items: listCompanies, requestSort, sortConfig } = useSortableData(companiesList, { direction: "sorting_asc", key: "firstName.lastName" });
   const [currentPage, setCurrentPage] = useState(1);
   const [totalCount, settotalCount] = useState("");
   const [totalPages, settotalPages] = useState(0);
   const [searchText, setsearchText] = useState("")
   const [showEntries, setshowEntries] = useState(10)
   const [selectedUser, setSelectedUser] = useState(null);
   const { getData: geCompaniesFetchData, postData, deleteData } = useAxios()
   const confirm = useConfirm();
   const navigate = useNavigate();

   const getCompanies = useCallback(async () => {
      const url = `${Constants.ApiUrl.companies.getCompanies}?pageNumber=${currentPage}&limit=${showEntries}&searchText=${searchText}`;
      const { success, data, message } = await geCompaniesFetchData(url);
      if (success) {
         const { companies, totalCount, totalPages } = data;
         setcompaniesList(companies);
         settotalPages(totalPages);
         settotalCount(totalCount);
      } else {
         toaster({ message, success });
      }
   }, [currentPage, showEntries, searchText, geCompaniesFetchData]);

   useEffect(() => {
      if (!isSubmittingForm) {
         getCompanies();
      }
   }, [isSubmittingForm, selectedUser, getCompanies]);

   const onAddEditUserSubmit = (isAdd, formData, setErrors) => {

      setIsSubmittingForm(true);
      if (isAdd) {
         addUser(formData, setErrors);
         return;
      }
   }
   const onCloseform = () => {
      setTimeout(() => {
         postData(Constants.ApiUrl.logout.logout, {}).then((res) => {
            console.log(res, "res in  master databse switch");
            getCompanies();

         }).catch(err => {
            console.log(err, "error in  master databse switch");
         })
      }, 5000);

      setIsSubmittingForm(false);
      setSelectedUser(false);

   }

   const addUser = (formData, setErrors) => {

      postData(Constants.ApiUrl.user.add, formData).then(() => {
         onFormSubmitted();
      }).catch(err => {
         setErrors({ ...err?.response?.data?.message })
         setIsSubmittingForm(false);
         //  onFormSubmitted();
      })

   }

   const onFormSubmitted = () => {
      setIsSubmittingForm(false);
   }
   const handlePageChange = (pageNumber) => {
      setCurrentPage(pageNumber);
   };

   const handleEdit = (user) => {
      setSelectedUser(user);
   };

   const handleDelete = async (user) => {
      const ok = await confirm({
         title: "Delete this company?",
         description: `This will remove ${user.companyName || user.domainName}.`,
         confirmText: "Delete",
         cancelText: "Cancel",
      });
      if (!ok) return;

      await deleteData(`${Constants.ApiUrl.companies.deleteCompanyUsers}/${user.domainName}`);
      getCompanies();
   }

   const handleSearchInputChange = (e) => {
      setsearchText(e.target.value)
   };

   const debouncedHandleSearchChange = debounce(handleSearchInputChange, 500);

   return (
      <SuperAdminPageWrapper>
         <div className={`container ${caseListContainerClasses}`}>
            <div className='listing template-listing'>
               <RenderIf shouldRender={!isSubmittingForm && !selectedUser}>
                  <div className="row items-center">
                     <div className="col-md-6">
                        <span className="text-[calc(var(--spacing)*10)] text-black font-serif font-bold">Companies</span>
                     </div>
                     <div className="col-md-6 flex items-center">
                        <div className={searchWrapperClasses}>
                           <input
                              onChange={debouncedHandleSearchChange}
                              type="search"
                              className={searchInputClasses}
                              placeholder="Search Companies"
                              aria-controls="myTable"
                           />
                           <i className={searchIconClasses}></i>
                        </div>
                        <XButton
                           onClick={() => setIsSubmittingForm(true)}
                           className="ml-2! min-w-45"
                        >
                           <i className="fa-solid fa-plus mr-2!"></i>Add Companies
                        </XButton>
                     </div>
                  </div>
               </RenderIf>
               <RenderIf shouldRender={isSubmittingForm}>

                  <AddCompaniesForm
                     onSubmit={onAddEditUserSubmit}
                     isSubmittingForm={onCloseform}
                  />
               </RenderIf>
               <RenderIf shouldRender={!isSubmittingForm && !selectedUser}>
                  <table className={`dp-table mt-12! ${caseListTableClasses}`}>
                     <thead>
                        <tr>
                           <th onClick={() => requestSort('firstName.lastName')} tabIndex="0" aria-controls="myTable" rowSpan="1" colSpan="1" aria-sort={sortConfig?.direction === "sorting_asc" ? "ascending" : "descending"} aria-label={sortConfig?.direction === "sorting_asc" ? "ascending" : "descending"}>Company Name</th>
                           <th onClick={() => requestSort('firstName.lastName')} tabIndex="0" aria-controls="myTable" rowSpan="1" colSpan="1" aria-sort={sortConfig?.direction === "sorting_asc" ? "ascending" : "descending"} aria-label={sortConfig?.direction === "sorting_asc" ? "ascending" : "descending"}>First Name</th>
                           <th onClick={() => requestSort('firstName.lastName')} tabIndex="0" aria-controls="myTable" rowSpan="1" colSpan="1" aria-sort={sortConfig?.direction === "sorting_asc" ? "ascending" : "descending"} aria-label={sortConfig?.direction === "sorting_asc" ? "ascending" : "descending"}>Last Name</th>
                           <th onClick={() => requestSort('email')} tabIndex="0" aria-controls="myTable" rowSpan="1" colSpan="1" aria-sort={sortConfig?.direction === "sorting_asc" ? "ascending" : "descending"} aria-label={sortConfig?.direction === "sorting_asc" ? "ascending" : "descending"}>Contact Email Address</th>
                           <th onClick={() => requestSort('mobileNumber')} tabIndex="0" aria-controls="myTable" rowSpan="1" colSpan="1" aria-sort={sortConfig?.direction === "sorting_asc" ? "ascending" : "descending"} aria-label={sortConfig?.direction === "sorting_asc" ? "ascending" : "descending"}>Company Phone Number</th>
                           <th onClick={() => requestSort('firstName')} tabIndex="0" aria-controls="myTable" rowSpan="1" colSpan="1" aria-sort={sortConfig?.direction === "sorting_asc" ? "ascending" : "descending"} aria-label={sortConfig?.direction === "sorting_asc" ? "ascending" : "descending"}>Company Address</th>
                           <th onClick={() => requestSort('firstName')} tabIndex="0" aria-controls="myTable" rowSpan="1" colSpan="1" aria-sort={sortConfig?.direction === "sorting_asc" ? "ascending" : "descending"} aria-label={sortConfig?.direction === "sorting_asc" ? "ascending" : "descending"}>Subscription Renewal Date</th>
                           <th onClick={() => requestSort('firstName')} tabIndex="0" aria-controls="myTable" rowSpan="1" colSpan="1" aria-sort={sortConfig?.direction === "sorting_asc" ? "ascending" : "descending"} aria-label={sortConfig?.direction === "sorting_asc" ? "ascending" : "descending"}>View company</th>
                           <th onClick={() => requestSort('firstName')} tabIndex="0" aria-controls="myTable" rowSpan="1" colSpan="1" aria-sort={sortConfig?.direction === "sorting_asc" ? "ascending" : "descending"} aria-label={sortConfig?.direction === "sorting_asc" ? "ascending" : "descending"}>Edit</th>
                           <th onClick={() => requestSort('firstName')} tabIndex="0" aria-controls="myTable" rowSpan="1" colSpan="1" aria-sort={sortConfig?.direction === "sorting_asc" ? "ascending" : "descending"} aria-label={sortConfig?.direction === "sorting_asc" ? "ascending" : "descending"}>Delete</th>
                        </tr>
                     </thead>
                     <tbody>
                        {listCompanies?.map((user, i) => (
                           <tr key={i} className={caseListRowClasses}>
                              <td>
                                 <span>{user?.companyName}</span>
                              </td>
                              <td>
                                 <span>{user?.firstName}</span>
                              </td>
                              <td>
                                 <span>{user?.lastName}</span>
                              </td>
                              <td>{user?.contactEmail}</td>
                              <td>{user?.companyPhoneNumber}</td>
                              <td>{user?.companyAddress}</td>
                              <td>{formatUTCDate(user?.subscription?.subscriptionRenewalDate)}</td>
                              <td>
                                 <XButton
                                    variant="iconOutline"
                                    onClick={() => navigate(`/super/firm-dashboard/${getDBName(user.domainName)}`)}
                                    aria-label="View company"
                                 >
                                    <FaEye />
                                 </XButton>
                              </td>
                              <td>
                                 <XButton
                                    variant="iconOutline"
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       handleEdit(user);
                                    }}
                                    aria-label="Edit company"
                                 >
                                    <EditButtonIcon />
                                 </XButton>
                              </td>
                              <td>
                                 <XButton
                                    variant="iconOutline"
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       handleDelete(user);
                                    }}
                                    aria-label="Delete company"
                                 >
                                    <FaTrash />
                                 </XButton>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
                  <div className="flex justify-between items-center">
                     <div className="flex gap-6 items-center">
                        <span className="text-sm text-content">Showing 1 - {showEntries} of {totalCount}</span>
                        <div>
                           <XSelect
                              value={showEntries}
                              onChange={(e) => setshowEntries(parseInt(e.target.value))}
                              options={PAGE_SIZE_OPTIONS}
                              emptyOption={false}
                              className="inline-block w-auto rounded-full"
                           />
                        </div>
                     </div>
                     <PaginationNavigation
                        handlePageChange={handlePageChange}
                        currentPage={currentPage}
                        totalPages={totalPages}
                     />
                  </div>
               </RenderIf>
               <RenderIf shouldRender={selectedUser}>
                  <EditCompaniesForm
                     selectedUser={selectedUser}
                     onSubmit={(formData, setErrors) => onAddEditUserSubmit(false, formData, setErrors)}
                     isSubmittingForm={onCloseform}
                  />
               </RenderIf>
            </div>
         </div>
      </SuperAdminPageWrapper>
   )

}

export default Companies;