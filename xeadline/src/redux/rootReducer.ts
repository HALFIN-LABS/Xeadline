import { combineReducers } from '@reduxjs/toolkit'
// Import slices
import nostrReducer from './slices/nostrSlice'
import testReducer from './slices/testSlice'
import authReducer from './slices/authSlice'
import profileReducer from './slices/profileSlice'
import topicReducer from './slices/topicSlice'

export const rootReducer = combineReducers({
  // Add reducers
  nostr: nostrReducer,
  test: testReducer,
  auth: authReducer,
  profile: profileReducer,
  topic: topicReducer,
})
