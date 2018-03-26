import React from "react";
import { observable } from "mobx";
import { View, ActivityIndicator, Image, Dimensions } from "react-native";
import { observer } from "mobx-react";
import Lifecycle from "components/Lifecycle";
import { createStackNavigator } from "react-navigation";
import glamorous from "glamorous-native";
import _ from "lodash";
import computeDistance from "./computeDistance";

export default context => {
  const { stores } = context;
  const createAsyncOp = require("core/asyncOp").default(context);
  const opsGetAll = createAsyncOp(params =>
    context.rest.get(`candidate/job`, params)
  );
  const opsGetOne = createAsyncOp(({ id }) =>
    context.rest.get(`candidate/job/${id}`)
  );
  const Text = require("components/Text").default(context);
  const List = require("components/List").default(context);
  const Page = require("components/Page").default(context);
  const LoadingScreen = require("components/LoadingScreen").default(context);

  opsGetAll.data = [];

  const store = observable({
    description: "",
    fetch: _.debounce(() => fetchJobs(), 1)
  });

  async function fetchJobs() {
    console.log("fetchJobs ", stores.profile.location);
    const { coords = {} } = stores.core.geoLoc.location;
    console.log("fetchJobs coords ", coords);
    await opsGetAll.fetch({
      sectors: stores.profile.sectors.toJS(),
      lat: coords.latitude,
      lon: coords.longitude,
      max: "50"
    });
    
  }

  store.location = "london";

  stores.jobs = store;

  const ItemView = glamorous.view({
    margin: 6,
    borderWidth: 1,
    borderColor: "white",
    borderRadius: 6,
    backgroundColor: "white"
  });

  const LogoView = glamorous.image({
    height: 80
  });

  const CompanyLogo = ({ logoURI }) => <LogoView source={{ uri: logoURI }} />;

  const Title = glamorous(Text)({
    fontSize: 16,
    fontWeight: "bold"
  });

  const Sector = glamorous(Text)({
    fontSize: 12,
    fontWeight: "bold",
    backgroundColor: "lightgrey",
    alignSelf: "flex-start",
    borderRadius: 3,
    color: "grey",
    padding: 4
  });

  const JobDescription = glamorous(Text)({
    fontSize: 14
  });

  const CompanyName = glamorous(Text)({
    fontSize: 14,
    fontWeight: "bold"
  });

  const Location = glamorous(Text)({
    color: "grey"
  });

  const JobItem = ({ job }) => {
    const image64 = _.get(job.picture, "base64");
    return (
      <ItemView
        style={{
          padding: 8,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          alignContent: "flex-start"
        }}
      >
        <View style={{ flexGrow: 1 }}>
          <View>
            {job.company_logo_url && (
              <CompanyLogo logoURI={job.company_logo_url} />
            )}
          </View>
          {image64 && (
            <Image style={{ height: 200 }} source={{ uri: image64 }} />
          )}
          <Title>{job.title}</Title>
          <JobDescription>{job.description}</JobDescription>
          <Sector>{job.sector}</Sector>
          {job.company_name && <CompanyName>{job.company_name}</CompanyName>}
          {job.location && (
            <Location>
              {computeDistance(job.geo, context.stores.core.geoLoc)} {`\u00b7`}{" "}
              {job.location.description}
            </Location>
          )}
        </View>
      </ItemView>
    );
  };

  const onPressJob = (job, navigation) => {
    navigation.navigate("JobDetails");
    opsGetOne.fetch({
      id: job.id
    });
  };
  

  const Jobs = observer(({ opsGetAll, navigation }) => (
    <Page>
      <List
        onPress={item => onPressJob(item, navigation)}
        onKey={item => item.id}
        items={opsGetAll.data}
        renderItem={item => <JobItem job={item} />}
      />
    </Page>
  ));

  const JobDetails = require("./JobDetails").default(context);

  return createStackNavigator(
    {
      Jobs: {
        screen: props => (
          <Lifecycle
            didMount={() => {
              props.navigation.addListener("didFocus", () => {
                store.fetch();
              });
            }}
          >
            {opsGetAll.loading && <LoadingScreen label="Loading Jobs..."/>}
            {!opsGetAll.loading &&
            opsGetAll.data && (
              <Jobs opsGetAll={opsGetAll} store={store} {...props} />
            )}
          </Lifecycle>
        )
      },
      JobDetails: {
        screen: props => <JobDetails opsGetOne={opsGetOne} {...props} />,
        navigationOptions: () => ({
          title: "Job Details",
          header: undefined
        })
      }
    },
    {
      navigationOptions: {
        header: null
      },
      mode: "modal"
    }
  );
};
